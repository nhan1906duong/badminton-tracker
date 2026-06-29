-- Phase 4: Batch reorder_queue and eliminate correlated subqueries in
-- end_session / recalculate_all_ratings.
--
-- reorder_queue: replace per-row PL/pgSQL loop with a single batch UPDATE.
-- end_session: pre-fetch all match/team data into a temp table before the loop,
--   replacing three correlated subqueries per match with a single JOIN.
-- recalculate_all_ratings: same pre-fetch pattern per session inside the outer loop.

-- ============================================================
-- RPC: reorder_queue — single batch UPDATE instead of per-row loop
-- ============================================================
create or replace function reorder_queue(p_updates jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update matches m
  set queue_position = u.pos
  from (
    select
      (elem->>'id')::uuid            as id,
      (elem->>'queue_position')::int  as pos
    from jsonb_array_elements(p_updates) as elem
  ) u
  where m.id = u.id;
end;
$$;

grant execute on function reorder_queue(jsonb) to authenticated;

-- ============================================================
-- RPC: end_session — pre-fetch matches + team IDs before the loop
-- ============================================================
create or replace function end_session(p_id uuid)
returns setof sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match        record;
  v_team_a_rating numeric;
  v_team_b_rating numeric;
  v_expected_a   numeric;
  v_delta_a      int;
  v_delta_b      int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Build running ratings temp table from current player ratings for this session
  create temp table _ratings on commit drop as
  select distinct mp.player_id,
    coalesce(pl.rating, 1000)::numeric as rating
  from matches m
  join match_participants mp on mp.match_id = m.id
  join players pl on pl.id = mp.player_id
  where m.session_id = p_id
    and m.status = 'COMPLETED';

  -- Pre-fetch all completed matches + team IDs + winner in one JOIN instead of
  -- three correlated subqueries per row in the loop below.
  create temp table _matches on commit drop as
  select
    m.id          as match_id,
    m.played_at,
    ta.id         as team_a_id,
    tb.id         as team_b_id,
    tw.team_label as winner_team
  from matches m
  join match_teams ta on ta.match_id = m.id and ta.team_label = 'TEAM_A'
  join match_teams tb on tb.match_id = m.id and tb.team_label = 'TEAM_B'
  left join match_teams tw on tw.match_id = m.id and tw.is_winner = true
  where m.session_id = p_id
    and m.status = 'COMPLETED';

  for v_match in
    select * from _matches order by played_at asc
  loop
    if v_match.winner_team is null then
      continue;
    end if;

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

    v_expected_a := _expected_win_rate(v_team_a_rating, v_team_b_rating);
    v_delta_a := _rating_delta(v_expected_a, case when v_match.winner_team = 'TEAM_A' then 1.0 else 0.0 end);
    v_delta_b := _rating_delta(1.0 - v_expected_a, case when v_match.winner_team = 'TEAM_B' then 1.0 else 0.0 end);

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

    update _ratings
    set rating = rating + v_delta_a
    where player_id in (
      select player_id from match_participants
      where match_id = v_match.match_id and team_id = v_match.team_a_id
    );

    update _ratings
    set rating = rating + v_delta_b
    where player_id in (
      select player_id from match_participants
      where match_id = v_match.match_id and team_id = v_match.team_b_id
    );
  end loop;

  update players p
  set rating = r.rating
  from _ratings r
  where p.id = r.player_id;

  update sessions set ended_at = now() where id = p_id;

  perform refresh_player_session_stats(p_id);
  perform refresh_player_all_time_stats();

  return query select * from sessions where id = p_id;
end;
$$;

grant execute on function end_session(uuid) to authenticated;

-- ============================================================
-- RPC: recalculate_all_ratings — pre-fetch match/team data per session
-- ============================================================
create or replace function recalculate_all_ratings()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session      record;
  v_match        record;
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

  update players set rating = 1000;

  delete from player_match_results;

  create temp table _run_ratings on commit drop as
  select id as player_id, 1000::numeric as rating from players;

  for v_session in
    select id, started_at, ended_at
    from sessions
    order by started_at asc
  loop
    v_is_ended := v_session.ended_at is not null;

    -- Pre-fetch all completed matches + team IDs + winner for this session.
    -- DROP + CREATE because ON COMMIT DROP only fires at transaction end, not
    -- between loop iterations.
    drop table if exists _sess_matches;
    create temp table _sess_matches on commit drop as
    select
      m.id          as match_id,
      m.played_at,
      ta.id         as team_a_id,
      tb.id         as team_b_id,
      tw.team_label as winner_team
    from matches m
    join match_teams ta on ta.match_id = m.id and ta.team_label = 'TEAM_A'
    join match_teams tb on tb.match_id = m.id and tb.team_label = 'TEAM_B'
    left join match_teams tw on tw.match_id = m.id and tw.is_winner = true
    where m.session_id = v_session.id
      and m.status = 'COMPLETED';

    for v_match in
      select * from _sess_matches order by played_at asc
    loop
      if v_match.winner_team is null then continue; end if;

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

      v_delta_a := 0;
      v_delta_b := 0;
      if v_is_ended then
        v_expected_a := _expected_win_rate(v_team_a_rating, v_team_b_rating);
        v_delta_a := _rating_delta(v_expected_a, case when v_match.winner_team = 'TEAM_A' then 1.0 else 0.0 end);
        v_delta_b := _rating_delta(1.0 - v_expected_a, case when v_match.winner_team = 'TEAM_B' then 1.0 else 0.0 end);
      end if;

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
        (mt.team_label = v_match.winner_team),
        case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
        case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end,
        case when mt.team_label = v_match.winner_team then 10 else 3 end,
        1,
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
        case when v_is_ended then r.rating else null end,
        case when v_is_ended then
          r.rating + case when mt.team_label = 'TEAM_A' then v_delta_a else v_delta_b end
        else null end,
        case when v_is_ended then
          case when mt.team_label = 'TEAM_A' then v_delta_a else v_delta_b end
        else null end
      from match_participants mp
      join match_teams mt on mt.id = mp.team_id
      join _run_ratings r on r.player_id = mp.player_id
      where mp.match_id = v_match.match_id;

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

  update players p
  set rating = r.rating
  from _run_ratings r
  where p.id = r.player_id;

  for v_sess_id in select id from sessions loop
    perform refresh_player_session_stats(v_sess_id);
  end loop;
  perform refresh_player_all_time_stats();
end;
$$;

grant execute on function recalculate_all_ratings() to authenticated;
