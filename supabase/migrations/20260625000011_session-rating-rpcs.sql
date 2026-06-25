-- Phase 4: Session rating RPCs
-- Moves end_session, delete_session, recalculate_all_ratings, and clear_all_data
-- from client-side TypeScript into server-side PL/pgSQL for atomicity and scalability.

-- ---------------------------------------------------------------------------
-- Helper: JS-parity Elo rating delta
-- JS Math.round rounds half UP toward +∞ (e.g. -0.5 → 0).
-- PostgreSQL round() rounds half AWAY from zero (e.g. -0.5 → -1).
-- floor(x + 0.5) always rounds half up, matching JS Math.round exactly.
-- ---------------------------------------------------------------------------
create or replace function _rating_delta(
  p_expected numeric,
  p_actual   numeric,   -- 1.0 for win, 0.0 for loss
  p_k        int default 32
) returns int
language sql immutable
set search_path = public
as $$
  select floor(p_k * (p_actual - p_expected) + 0.5)::int;
$$;

-- ---------------------------------------------------------------------------
-- Helper: Expected win rate (Elo formula)
-- ---------------------------------------------------------------------------
create or replace function _expected_win_rate(
  p_team_rating numeric,
  p_opp_rating  numeric
) returns numeric
language sql immutable
set search_path = public
as $$
  select 1.0 / (1.0 + power(10.0, (p_opp_rating - p_team_rating) / 400.0));
$$;

-- ---------------------------------------------------------------------------
-- 1. end_session(p_id uuid) → setof sessions
-- Any authenticated user can end a session.
-- Processes all completed matches in chronological order, applies Elo changes
-- using a running temp table, writes rating history, persists final ratings,
-- marks session ended, refreshes materialized stats.
-- ---------------------------------------------------------------------------
create or replace function end_session(p_id uuid)
returns setof sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match        record;
  v_team_a_id    uuid;
  v_team_b_id    uuid;
  v_team_a_rating numeric;
  v_team_b_rating numeric;
  v_expected_a   numeric;
  v_delta_a      int;
  v_delta_b      int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Build running ratings temp table from current player ratings for this session
  create temp table _ratings on commit drop as
  select distinct mp.player_id,
    coalesce(pl.rating, 1000)::numeric as rating
  from matches m
  join match_participants mp on mp.match_id = m.id
  join players pl on pl.id = mp.player_id
  where m.session_id = p_id
    and m.status = 'COMPLETED';

  -- 2. Process each completed match in chronological order
  for v_match in
    select
      m.id as match_id,
      (select id from match_teams where match_id = m.id and team_label = 'TEAM_A') as team_a_id,
      (select id from match_teams where match_id = m.id and team_label = 'TEAM_B') as team_b_id,
      (select team_label from match_teams where match_id = m.id and is_winner = true) as winner_team
    from matches m
    where m.session_id = p_id
      and m.status = 'COMPLETED'
    order by m.played_at asc
  loop
    -- Skip matches with no winner
    if v_match.winner_team is null then
      continue;
    end if;

    -- Calculate team avg ratings from running temp table
    select coalesce(avg(r.rating), 1000)
    into v_team_a_rating
    from match_participants mp
    join _ratings r on r.player_id = mp.player_id
    where mp.match_id = v_match.match_id
      and mp.team_id = v_match.team_a_id;

    select coalesce(avg(r.rating), 1000)
    into v_team_b_rating
    from match_participants mp
    join _ratings r on r.player_id = mp.player_id
    where mp.match_id = v_match.match_id
      and mp.team_id = v_match.team_b_id;

    -- Compute Elo deltas
    v_expected_a := _expected_win_rate(v_team_a_rating, v_team_b_rating);
    v_delta_a := _rating_delta(v_expected_a, case when v_match.winner_team = 'TEAM_A' then 1.0 else 0.0 end);
    v_delta_b := _rating_delta(1.0 - v_expected_a, case when v_match.winner_team = 'TEAM_B' then 1.0 else 0.0 end);

    -- Write rating history to player_match_results
    update player_match_results pmr
    set
      rating_before = r.rating,
      rating_after  = r.rating + case when mp.team_id = v_match.team_a_id then v_delta_a else v_delta_b end,
      rating_delta  = case when mp.team_id = v_match.team_a_id then v_delta_a else v_delta_b end
    from match_participants mp
    join _ratings r on r.player_id = mp.player_id
    where pmr.player_id = mp.player_id
      and pmr.match_id = v_match.match_id
      and mp.match_id = v_match.match_id;

    -- Advance running ratings for TEAM_A
    update _ratings
    set rating = rating + v_delta_a
    where player_id in (
      select player_id from match_participants
      where match_id = v_match.match_id and team_id = v_match.team_a_id
    );

    -- Advance running ratings for TEAM_B
    update _ratings
    set rating = rating + v_delta_b
    where player_id in (
      select player_id from match_participants
      where match_id = v_match.match_id and team_id = v_match.team_b_id
    );
  end loop;

  -- 3. Persist final ratings to players table
  update players p
  set rating = r.rating
  from _ratings r
  where p.id = r.player_id;

  -- 4. Mark session as ended
  update sessions set ended_at = now() where id = p_id;

  -- 5. Refresh materialized stats
  perform refresh_player_session_stats(p_id);
  perform refresh_player_all_time_stats();

  -- 6. Return the ended session row
  return query select * from sessions where id = p_id;
end;
$$;

grant execute on function end_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. delete_session(p_id uuid) → void
-- Admin only. Deletes a session and all its child rows in dependency order.
-- ---------------------------------------------------------------------------
create or replace function delete_session(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin required';
  end if;

  -- Collect all match IDs for this session
  select array_agg(id) into v_match_ids
  from matches
  where session_id = p_id;

  -- Delete child rows if any matches exist
  if v_match_ids is not null then
    delete from match_scores       where match_id = any(v_match_ids);
    delete from match_participants where match_id = any(v_match_ids);
    delete from match_teams        where match_id = any(v_match_ids);
    delete from player_match_results where match_id = any(v_match_ids);
    delete from matches            where id = any(v_match_ids);
  end if;

  -- Delete the session (player_session_stats CASCADE deletes with session FK)
  delete from sessions where id = p_id;

  -- Refresh all-time stats since a session was removed
  perform refresh_player_all_time_stats();
end;
$$;

grant execute on function delete_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. recalculate_all_ratings() → void
-- Admin only. Replays ALL match history from scratch.
-- Resets all ratings to 1000, rebuilds player_match_results, persists
-- final ratings, refreshes all session stats + all-time stats.
-- Open sessions get weekly points but no Elo (filled when session ends).
-- ---------------------------------------------------------------------------
create or replace function recalculate_all_ratings()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session      record;
  v_match        record;
  v_team_a_id    uuid;
  v_team_b_id    uuid;
  v_team_a_rating numeric;
  v_team_b_rating numeric;
  v_expected_a   numeric;
  v_delta_a      int;
  v_delta_b      int;
  v_a_score      int;
  v_b_score      int;
  v_is_ended     bool;
  v_sess_id      uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin required';
  end if;

  -- 1. Reset all player ratings to 1000
  update players set rating = 1000;

  -- 2. Wipe all existing player_match_results (clean slate)
  delete from player_match_results;

  -- 3. Running ratings temp table — all players start at 1000
  create temp table _run_ratings on commit drop as
  select id as player_id, 1000::numeric as rating from players;

  -- 4. Process sessions in chronological order
  for v_session in
    select id, started_at, ended_at
    from sessions
    order by started_at asc
  loop
    v_is_ended := v_session.ended_at is not null;

    -- 5. Process each completed match in this session (chronological)
    for v_match in
      select
        m.id as match_id,
        (select id from match_teams where match_id = m.id and team_label = 'TEAM_A') as team_a_id,
        (select id from match_teams where match_id = m.id and team_label = 'TEAM_B') as team_b_id,
        (select team_label from match_teams where match_id = m.id and is_winner = true) as winner_team
      from matches m
      where m.session_id = v_session.id
        and m.status = 'COMPLETED'
      order by m.played_at asc
    loop
      if v_match.winner_team is null then continue; end if;

      -- Get team avg ratings from running map
      select coalesce(avg(r.rating), 1000)
      into v_team_a_rating
      from match_participants mp
      join _run_ratings r on r.player_id = mp.player_id
      where mp.match_id = v_match.match_id and mp.team_id = v_match.team_a_id;

      select coalesce(avg(r.rating), 1000)
      into v_team_b_rating
      from match_participants mp
      join _run_ratings r on r.player_id = mp.player_id
      where mp.match_id = v_match.match_id and mp.team_id = v_match.team_b_id;

      -- Elo deltas (ended sessions only)
      v_delta_a := 0;
      v_delta_b := 0;
      if v_is_ended then
        v_expected_a := _expected_win_rate(v_team_a_rating, v_team_b_rating);
        v_delta_a := _rating_delta(v_expected_a, case when v_match.winner_team = 'TEAM_A' then 1.0 else 0.0 end);
        v_delta_b := _rating_delta(1.0 - v_expected_a, case when v_match.winner_team = 'TEAM_B' then 1.0 else 0.0 end);
      end if;

      -- Get first score for this match (defaults to 0,0 if none recorded)
      select coalesce(team_a_score, 0), coalesce(team_b_score, 0)
      into v_a_score, v_b_score
      from match_scores
      where match_id = v_match.match_id
      order by set_number asc
      limit 1;
      if not found then
        v_a_score := 0;
        v_b_score := 0;
      end if;

      -- Insert player_match_results for all participants in this match
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
        total_weekly_points,
        rating_before,
        rating_after,
        rating_delta
      )
      select
        mp.player_id,
        v_match.match_id,
        v_session.id,
        -- is_winner
        (mt.team_label = v_match.winner_team),
        -- team_score / opponent_score
        case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
        case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end,
        -- base_points
        case when mt.team_label = v_match.winner_team then 10 else 3 end,
        -- attendance_points
        1,
        -- score_bonus
        case
          when mt.team_label = v_match.winner_team then
            _score_diff_bonus(
              case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
              case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end
            )
          else
            _close_game_bonus(
              case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end
            )
        end,
        -- strength_bonus
        case
          when mt.team_label = v_match.winner_team then
            _winner_strength_bonus(
              case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
              case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
            )
          else
            _loser_strength_adj(
              case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
              case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
            )
        end,
        -- total_weekly_points = max(1, base + attendance + score_bonus + strength_bonus)
        greatest(1,
          case when mt.team_label = v_match.winner_team then 10 else 3 end
          + 1
          + case
              when mt.team_label = v_match.winner_team then
                _score_diff_bonus(
                  case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
                  case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end
                )
              else
                _close_game_bonus(
                  case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end
                )
            end
          + case
              when mt.team_label = v_match.winner_team then
                _winner_strength_bonus(
                  case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
                  case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
                )
              else
                _loser_strength_adj(
                  case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
                  case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
                )
            end
        ),
        -- rating_before (null for open sessions)
        case when v_is_ended then r.rating else null end,
        -- rating_after (null for open sessions)
        case when v_is_ended then
          r.rating + case when mt.team_label = 'TEAM_A' then v_delta_a else v_delta_b end
        else null end,
        -- rating_delta (null for open sessions)
        case when v_is_ended then
          case when mt.team_label = 'TEAM_A' then v_delta_a else v_delta_b end
        else null end
      from match_participants mp
      join match_teams mt on mt.id = mp.team_id
      join _run_ratings r on r.player_id = mp.player_id
      where mp.match_id = v_match.match_id;

      -- Advance running ratings (ended sessions only)
      if v_is_ended then
        update _run_ratings
        set rating = rating + v_delta_a
        where player_id in (
          select player_id from match_participants
          where match_id = v_match.match_id and team_id = v_match.team_a_id
        );

        update _run_ratings
        set rating = rating + v_delta_b
        where player_id in (
          select player_id from match_participants
          where match_id = v_match.match_id and team_id = v_match.team_b_id
        );
      end if;

    end loop; -- end match loop
  end loop; -- end session loop

  -- 6. Persist final ratings to players table
  update players p
  set rating = r.rating
  from _run_ratings r
  where p.id = r.player_id;

  -- 7. Refresh all session stats then all-time stats
  for v_sess_id in select id from sessions loop
    perform refresh_player_session_stats(v_sess_id);
  end loop;
  perform refresh_player_all_time_stats();
end;
$$;

grant execute on function recalculate_all_ratings() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. clear_all_data() → void
-- Admin only. Deletes all match, session, and player data from the DB.
-- NOTE: Storage avatar cleanup CANNOT be done from PL/pgSQL — the TypeScript
--       hook handles storage deletion BEFORE calling this RPC.
-- ---------------------------------------------------------------------------
create or replace function clear_all_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin required';
  end if;

  -- Delete in dependency order
  delete from match_scores;
  delete from match_participants;
  delete from match_teams;
  delete from player_match_results;
  delete from league_team_players;
  delete from league_teams;
  delete from matches;
  delete from sessions;
  delete from players;

  -- Clear user profile avatars (keep profiles rows, just remove avatar_url)
  update profiles set avatar_url = null;
end;
$$;

grant execute on function clear_all_data() to authenticated;
