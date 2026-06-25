-- Phase 3: Complex match-state RPCs
-- Replaces multi-step client-side mutations with atomic Postgres transactions.
-- Covers: update_match, record_result, end_match_no_winner, update_match_players

-- ============================================================
-- Private helper functions (no grants — internal use only)
-- ============================================================

-- Score difference bonus for the winning team
create or replace function _score_diff_bonus(p_winner int, p_loser int)
returns int
language sql immutable as $$
  select case
    when (p_winner - p_loser) <= 4  then 1
    when (p_winner - p_loser) <= 10 then 2
    when (p_winner - p_loser) <= 16 then 3
    else 4
  end;
$$;

-- Close-game consolation bonus for the losing team
create or replace function _close_game_bonus(p_loser_score int)
returns int
language sql immutable as $$
  select case
    when p_loser_score >= 19 then 3
    when p_loser_score >= 16 then 2
    when p_loser_score >= 13 then 1
    else 0
  end;
$$;

-- Strength bonus for the winning team (beating a stronger opponent)
create or replace function _winner_strength_bonus(p_winner_rating numeric, p_opp_rating numeric)
returns int
language sql immutable as $$
  select case
    when (p_opp_rating - p_winner_rating) < -100 then 0
    when (p_opp_rating - p_winner_rating) <= 100  then 1
    when (p_opp_rating - p_winner_rating) <= 250  then 2
    when (p_opp_rating - p_winner_rating) <= 400  then 4
    else 6
  end;
$$;

-- Strength adjustment for the losing team (penalty for losing to a weaker side)
create or replace function _loser_strength_adj(p_loser_rating numeric, p_winner_rating numeric)
returns int
language sql immutable as $$
  select case
    when (p_loser_rating - p_winner_rating) > 250 then -3
    when (p_loser_rating - p_winner_rating) > 100 then -2
    else 0
  end;
$$;

-- ============================================================
-- RPC: update_match
-- Updates match fields, winner flags, and scores atomically.
-- ============================================================
create or replace function update_match(
  p_id          uuid,
  p_match_type  text,
  p_played_at   timestamptz,
  p_winner_team text,   -- 'TEAM_A' or 'TEAM_B'
  p_scores      jsonb   -- array of {set_number, team_a_score, team_b_score}
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Update match basic fields
  update matches
  set match_type = p_match_type::match_type,
      played_at  = p_played_at
  where id = p_id;

  -- Update winner flag for TEAM_A
  update match_teams
  set is_winner = (p_winner_team = 'TEAM_A')
  where match_id = p_id
    and team_label = 'TEAM_A';

  -- Update winner flag for TEAM_B
  update match_teams
  set is_winner = (p_winner_team = 'TEAM_B')
  where match_id = p_id
    and team_label = 'TEAM_B';

  -- Replace scores: delete old
  delete from match_scores where match_id = p_id;

  -- Insert new scores, skipping 0-0 sets
  if p_scores is not null and jsonb_array_length(p_scores) > 0 then
    insert into match_scores (match_id, set_number, team_a_score, team_b_score)
    select
      p_id,
      (elem->>'set_number')::int,
      (elem->>'team_a_score')::int,
      (elem->>'team_b_score')::int
    from jsonb_array_elements(p_scores) as elem
    where (elem->>'team_a_score')::int > 0
       or (elem->>'team_b_score')::int > 0;
  end if;
end;
$$;

grant execute on function update_match(uuid, text, timestamptz, text, jsonb) to authenticated;

-- ============================================================
-- RPC: record_result
-- Marks match COMPLETED, sets winner, replaces scores, upserts
-- player_match_results with calculated weekly points, then
-- refreshes materialized session + all-time stats.
-- ============================================================
create or replace function record_result(
  p_id          uuid,
  p_winner_team text,   -- 'TEAM_A' or 'TEAM_B'
  p_scores      jsonb   -- array of {set_number, team_a_score, team_b_score}
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id  uuid;
  v_a_score     int := 0;
  v_b_score     int := 0;
  v_team_a_rating numeric;
  v_team_b_rating numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Mark match COMPLETED
  update matches
  set status    = 'COMPLETED',
      ended_at  = now()
  where id = p_id;

  -- Update winner flags
  update match_teams
  set is_winner = (team_label = p_winner_team)
  where match_id = p_id;

  -- Replace scores: delete old
  delete from match_scores where match_id = p_id;

  -- Insert new scores, skipping 0-0 sets
  if p_scores is not null and jsonb_array_length(p_scores) > 0 then
    insert into match_scores (match_id, set_number, team_a_score, team_b_score)
    select
      p_id,
      (elem->>'set_number')::int,
      (elem->>'team_a_score')::int,
      (elem->>'team_b_score')::int
    from jsonb_array_elements(p_scores) as elem
    where (elem->>'team_a_score')::int > 0
       or (elem->>'team_b_score')::int > 0;
  end if;

  -- Fetch session_id for the match
  select session_id into v_session_id
  from matches
  where id = p_id;

  -- Calculate team average ratings (coalesce to 1000 when no rating)
  select
    coalesce(avg(case when mt.team_label = 'TEAM_A' then coalesce(pl.rating, 1000) end), 1000),
    coalesce(avg(case when mt.team_label = 'TEAM_B' then coalesce(pl.rating, 1000) end), 1000)
  into v_team_a_rating, v_team_b_rating
  from match_participants mp
  join match_teams mt on mt.id = mp.team_id
  join players pl on pl.id = mp.player_id
  where mp.match_id = p_id;

  -- Fetch first set score (lowest set_number); defaults to 0,0 if no scores recorded
  select team_a_score, team_b_score
  into v_a_score, v_b_score
  from match_scores
  where match_id = p_id
  order by set_number
  limit 1;

  -- Null-safe defaults
  v_a_score := coalesce(v_a_score, 0);
  v_b_score := coalesce(v_b_score, 0);

  -- Upsert player_match_results for every participant
  insert into player_match_results (
    player_id,
    match_id,
    session_id,
    is_winner,
    team_score,
    opponent_score,
    base_points,
    attendance_points,
    score_bonus,
    strength_bonus,
    total_weekly_points
  )
  select
    mp.player_id,
    p_id,
    v_session_id,
    (mt.team_label = p_winner_team)                                            as is_winner,
    case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end       as team_score,
    case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end       as opp_score,
    case when mt.team_label = p_winner_team then 10 else 3 end                 as base_points,
    1                                                                           as attendance_points,
    case when mt.team_label = p_winner_team
      then _score_diff_bonus(
        case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
        case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end
      )
      else _close_game_bonus(
        case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end
      )
    end                                                                         as score_bonus,
    case when mt.team_label = p_winner_team
      then _winner_strength_bonus(
        case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
        case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
      )
      else _loser_strength_adj(
        case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
        case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
      )
    end                                                                         as strength_bonus,
    greatest(1,
      case when mt.team_label = p_winner_team then 10 else 3 end
      + 1
      + case when mt.team_label = p_winner_team
          then _score_diff_bonus(
            case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
            case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end
          )
          else _close_game_bonus(
            case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end
          )
        end
      + case when mt.team_label = p_winner_team
          then _winner_strength_bonus(
            case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
            case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
          )
          else _loser_strength_adj(
            case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
            case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
          )
        end
    )                                                                           as total_weekly_points
  from match_participants mp
  join match_teams mt on mt.id = mp.team_id
  where mp.match_id = p_id
  on conflict (player_id, match_id) do update set
    session_id           = excluded.session_id,
    is_winner            = excluded.is_winner,
    team_score           = excluded.team_score,
    opponent_score       = excluded.opponent_score,
    base_points          = excluded.base_points,
    attendance_points    = excluded.attendance_points,
    score_bonus          = excluded.score_bonus,
    strength_bonus       = excluded.strength_bonus,
    total_weekly_points  = excluded.total_weekly_points;

  -- Refresh materialized stats
  perform refresh_player_session_stats(v_session_id);
  perform refresh_player_all_time_stats();
end;
$$;

grant execute on function record_result(uuid, text, jsonb) to authenticated;

-- ============================================================
-- RPC: end_match_no_winner
-- Marks match COMPLETED without a winner, clears results,
-- replaces scores, then refreshes materialized stats.
-- ============================================================
create or replace function end_match_no_winner(
  p_id     uuid,
  p_scores jsonb   -- array of {set_number, team_a_score, team_b_score}
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Mark match COMPLETED
  update matches
  set status   = 'COMPLETED',
      ended_at = now()
  where id = p_id;

  -- Clear winner flags
  update match_teams
  set is_winner = false
  where match_id = p_id;

  -- Clear player match results (no winner = no ranking impact)
  delete from player_match_results where match_id = p_id;

  -- Replace scores: delete old
  delete from match_scores where match_id = p_id;

  -- Insert new scores, skipping 0-0 sets
  if p_scores is not null and jsonb_array_length(p_scores) > 0 then
    insert into match_scores (match_id, set_number, team_a_score, team_b_score)
    select
      p_id,
      (elem->>'set_number')::int,
      (elem->>'team_a_score')::int,
      (elem->>'team_b_score')::int
    from jsonb_array_elements(p_scores) as elem
    where (elem->>'team_a_score')::int > 0
       or (elem->>'team_b_score')::int > 0;
  end if;

  -- Fetch session_id for the refresh calls
  select session_id into v_session_id
  from matches
  where id = p_id;

  -- Refresh materialized stats
  perform refresh_player_session_stats(v_session_id);
  perform refresh_player_all_time_stats();
end;
$$;

grant execute on function end_match_no_winner(uuid, jsonb) to authenticated;

-- ============================================================
-- RPC: update_match_players
-- Replaces match participants, recalculates player_match_results
-- when the match is already COMPLETED with a winner, then
-- refreshes materialized stats.
-- ============================================================
create or replace function update_match_players(
  p_id                 uuid,
  p_team_a_player_ids  uuid[],
  p_team_b_player_ids  uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id     uuid;
  v_status         text;
  v_team_a_id      uuid;
  v_team_b_id      uuid;
  v_winner_team    text;
  v_a_score        int := 0;
  v_b_score        int := 0;
  v_team_a_rating  numeric;
  v_team_b_rating  numeric;
  v_all_ids        uuid[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Validate no duplicate players across both teams
  v_all_ids := p_team_a_player_ids || p_team_b_player_ids;
  if (select count(distinct pid) from unnest(v_all_ids) as pid)
      != array_length(v_all_ids, 1) then
    raise exception 'A player can only appear once in a match.';
  end if;

  -- Fetch match metadata + team ids + winner
  select
    m.session_id,
    m.status,
    (select id from match_teams where match_id = m.id and team_label = 'TEAM_A'),
    (select id from match_teams where match_id = m.id and team_label = 'TEAM_B'),
    (select team_label from match_teams where match_id = m.id and is_winner = true)
  into v_session_id, v_status, v_team_a_id, v_team_b_id, v_winner_team
  from matches m
  where m.id = p_id;

  -- Replace participants
  delete from match_participants where match_id = p_id;

  insert into match_participants (match_id, team_id, player_id)
  select p_id, v_team_a_id, unnest(p_team_a_player_ids)
  union all
  select p_id, v_team_b_id, unnest(p_team_b_player_ids);

  -- Clear existing results; will re-calculate below if needed
  delete from player_match_results where match_id = p_id;

  -- Only recalculate results when the match is COMPLETED with a declared winner
  if v_status = 'COMPLETED' and v_winner_team is not null then

    -- Calculate team average ratings from the new participant set
    select
      coalesce(avg(case when pl_id = any(p_team_a_player_ids) then coalesce(pl.rating, 1000) end), 1000),
      coalesce(avg(case when pl_id = any(p_team_b_player_ids) then coalesce(pl.rating, 1000) end), 1000)
    into v_team_a_rating, v_team_b_rating
    from (
      select id as pl_id, rating from players
      where id = any(v_all_ids)
    ) pl;

    -- Fetch first set score (defaults to 0,0 if none)
    select team_a_score, team_b_score
    into v_a_score, v_b_score
    from match_scores
    where match_id = p_id
    order by set_number
    limit 1;

    v_a_score := coalesce(v_a_score, 0);
    v_b_score := coalesce(v_b_score, 0);

    -- Insert fresh player_match_results for all new participants
    insert into player_match_results (
      player_id,
      match_id,
      session_id,
      is_winner,
      team_score,
      opponent_score,
      base_points,
      attendance_points,
      score_bonus,
      strength_bonus,
      total_weekly_points
    )
    select
      mp.player_id,
      p_id,
      v_session_id,
      (mt.team_label = v_winner_team)                                            as is_winner,
      case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end       as team_score,
      case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end       as opp_score,
      case when mt.team_label = v_winner_team then 10 else 3 end                 as base_points,
      1                                                                           as attendance_points,
      case when mt.team_label = v_winner_team
        then _score_diff_bonus(
          case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
          case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end
        )
        else _close_game_bonus(
          case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end
        )
      end                                                                         as score_bonus,
      case when mt.team_label = v_winner_team
        then _winner_strength_bonus(
          case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
          case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
        )
        else _loser_strength_adj(
          case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
          case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
        )
      end                                                                         as strength_bonus,
      greatest(1,
        case when mt.team_label = v_winner_team then 10 else 3 end
        + 1
        + case when mt.team_label = v_winner_team
            then _score_diff_bonus(
              case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
              case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end
            )
            else _close_game_bonus(
              case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end
            )
          end
        + case when mt.team_label = v_winner_team
            then _winner_strength_bonus(
              case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
              case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
            )
            else _loser_strength_adj(
              case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
              case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
            )
          end
      )                                                                           as total_weekly_points
    from match_participants mp
    join match_teams mt on mt.id = mp.team_id
    where mp.match_id = p_id;

  end if;

  -- Refresh materialized stats
  perform refresh_player_session_stats(v_session_id);
  perform refresh_player_all_time_stats();
end;
$$;

grant execute on function update_match_players(uuid, uuid[], uuid[]) to authenticated;
