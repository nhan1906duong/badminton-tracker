-- Phase 3: Remove redundant refresh_player_all_time_stats() calls from RPCs
-- that operate exclusively on live (non-ended) sessions.
--
-- refresh_player_all_time_stats() aggregates player_match_results WHERE
-- session ended_at IS NOT NULL. During a live session nothing in that set
-- changes, so every call from record_result / end_match_no_winner /
-- update_match_players / reopen_match is a full no-op scan.
--
-- The call is preserved in: end_session, delete_session, delete_match,
-- recalculate_all_ratings — all of which can affect ended-session data.

-- ============================================================
-- RPC: record_result (remove all-time refresh)
-- ============================================================
create or replace function record_result(
  p_id          uuid,
  p_winner_team text,
  p_scores      jsonb
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

  update matches
  set status    = 'COMPLETED',
      ended_at  = now()
  where id = p_id;

  update match_teams
  set is_winner = (team_label = p_winner_team)
  where match_id = p_id;

  delete from match_scores where match_id = p_id;

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

  select session_id into v_session_id
  from matches
  where id = p_id;

  select
    coalesce(avg(case when mt.team_label = 'TEAM_A' then coalesce(pl.rating, 1000) end), 1000),
    coalesce(avg(case when mt.team_label = 'TEAM_B' then coalesce(pl.rating, 1000) end), 1000)
  into v_team_a_rating, v_team_b_rating
  from match_participants mp
  join match_teams mt on mt.id = mp.team_id
  join players pl on pl.id = mp.player_id
  where mp.match_id = p_id;

  select team_a_score, team_b_score
  into v_a_score, v_b_score
  from match_scores
  where match_id = p_id
  order by set_number
  limit 1;

  v_a_score := coalesce(v_a_score, 0);
  v_b_score := coalesce(v_b_score, 0);

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

  perform refresh_player_session_stats(v_session_id);
  -- refresh_player_all_time_stats() removed: live session cannot affect ended-session aggregates
end;
$$;

grant execute on function record_result(uuid, text, jsonb) to authenticated;

-- ============================================================
-- RPC: end_match_no_winner (remove all-time refresh)
-- ============================================================
create or replace function end_match_no_winner(
  p_id     uuid,
  p_scores jsonb
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

  update matches
  set status   = 'COMPLETED',
      ended_at = now()
  where id = p_id;

  update match_teams
  set is_winner = false
  where match_id = p_id;

  delete from player_match_results where match_id = p_id;

  delete from match_scores where match_id = p_id;

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

  select session_id into v_session_id
  from matches
  where id = p_id;

  perform refresh_player_session_stats(v_session_id);
  -- refresh_player_all_time_stats() removed: live session cannot affect ended-session aggregates
end;
$$;

grant execute on function end_match_no_winner(uuid, jsonb) to authenticated;

-- ============================================================
-- RPC: update_match_players (remove all-time refresh)
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

  v_all_ids := p_team_a_player_ids || p_team_b_player_ids;
  if (select count(distinct pid) from unnest(v_all_ids) as pid)
      != array_length(v_all_ids, 1) then
    raise exception 'A player can only appear once in a match.';
  end if;

  select
    m.session_id,
    m.status,
    (select id from match_teams where match_id = m.id and team_label = 'TEAM_A'),
    (select id from match_teams where match_id = m.id and team_label = 'TEAM_B'),
    (select team_label from match_teams where match_id = m.id and is_winner = true)
  into v_session_id, v_status, v_team_a_id, v_team_b_id, v_winner_team
  from matches m
  where m.id = p_id;

  delete from match_participants where match_id = p_id;

  insert into match_participants (match_id, team_id, player_id)
  select p_id, v_team_a_id, unnest(p_team_a_player_ids)
  union all
  select p_id, v_team_b_id, unnest(p_team_b_player_ids);

  delete from player_match_results where match_id = p_id;

  if v_status = 'COMPLETED' and v_winner_team is not null then

    select
      coalesce(avg(case when pl_id = any(p_team_a_player_ids) then coalesce(pl.rating, 1000) end), 1000),
      coalesce(avg(case when pl_id = any(p_team_b_player_ids) then coalesce(pl.rating, 1000) end), 1000)
    into v_team_a_rating, v_team_b_rating
    from (
      select id as pl_id, rating from players
      where id = any(v_all_ids)
    ) pl;

    select team_a_score, team_b_score
    into v_a_score, v_b_score
    from match_scores
    where match_id = p_id
    order by set_number
    limit 1;

    v_a_score := coalesce(v_a_score, 0);
    v_b_score := coalesce(v_b_score, 0);

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

  perform refresh_player_session_stats(v_session_id);
  -- refresh_player_all_time_stats() removed: live session cannot affect ended-session aggregates
end;
$$;

grant execute on function update_match_players(uuid, uuid[], uuid[]) to authenticated;

-- ============================================================
-- RPC: reopen_match (remove all-time refresh)
-- ============================================================
create or replace function reopen_match(p_match_id uuid)
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

  update matches
    set status = 'LIVE'
    where id = p_match_id;

  select session_id into v_session_id from matches where id = p_match_id;

  perform refresh_player_session_stats(v_session_id);
  -- refresh_player_all_time_stats() removed: reopening a match within a live session
  -- cannot affect ended-session aggregates
end;
$$;

grant execute on function reopen_match(uuid) to authenticated;
