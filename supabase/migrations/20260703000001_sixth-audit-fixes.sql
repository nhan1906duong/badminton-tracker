-- Phase 14: Sixth Audit Fixes
--
-- 1. Drop permissive pmr_insert / pmr_update / pmr_delete write policies on
--    player_match_results. All writes flow through SECURITY DEFINER RPCs that
--    bypass RLS; these policies allowed any authenticated user to POST fabricated
--    scores directly via PostgREST, bypassing scoring logic entirely.
-- 2. Revoke EXECUTE on _compute_match_pmr_rows from PUBLIC / anon — internal
--    helper should not be reachable from the API layer.
-- 3. Refactor recalculate_all_ratings to use _compute_match_pmr_rows, removing
--    ~70 lines of duplicated CASE-heavy scoring expressions left untouched by
--    the fifth audit (phases 1–13 fixed record_result and update_match_players
--    but missed this function).

-- ============================================================
-- 1. Lock down player_match_results direct writes
-- ============================================================

drop policy if exists "pmr_insert" on public.player_match_results;
drop policy if exists "pmr_update" on public.player_match_results;
drop policy if exists "pmr_delete" on public.player_match_results;

-- ============================================================
-- 2. Revoke internal helper from public roles
-- ============================================================

revoke execute
  on function public._compute_match_pmr_rows(uuid, uuid, text, int, int, numeric, numeric)
  from public, anon;

-- ============================================================
-- 3. recalculate_all_ratings — use _compute_match_pmr_rows
--
-- Only the inner INSERT block changes. Everything else is identical
-- to the phase-8 version. The join back to match_participants gives
-- us team_id so we can route v_delta_a vs v_delta_b correctly without
-- duplicating the CASE-on-team_label pattern.
-- ============================================================

create or replace function recalculate_all_ratings()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session       record;
  v_match         record;
  v_team_a_rating numeric;
  v_team_b_rating numeric;
  v_expected_a    numeric;
  v_delta_a       int;
  v_delta_b       int;
  v_a_score       int;
  v_b_score       int;
  v_is_ended      bool;
  v_sess_id       uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin') then
    raise exception 'Admin required';
  end if;

  update public.players set rating = 1000;
  delete from public.player_match_results;

  create temp table _run_ratings on commit drop as
  select id as player_id, 1000::numeric as rating from public.players;

  for v_session in
    select id, started_at, ended_at
    from public.sessions
    order by started_at asc
  loop
    v_is_ended := v_session.ended_at is not null;

    drop table if exists _sess_matches;
    create temp table _sess_matches on commit drop as
    select
      m.id          as match_id,
      m.played_at,
      ta.id         as team_a_id,
      tb.id         as team_b_id,
      tw.team_label as winner_team
    from public.matches m
    join public.match_teams ta on ta.match_id = m.id and ta.team_label = 'TEAM_A'
    join public.match_teams tb on tb.match_id = m.id and tb.team_label = 'TEAM_B'
    left join public.match_teams tw on tw.match_id = m.id and tw.is_winner = true
    where m.session_id = v_session.id
      and m.status = 'COMPLETED';

    for v_match in
      select * from _sess_matches order by played_at asc
    loop
      if v_match.winner_team is null then continue; end if;

      select coalesce(avg(r.rating), 1000)
      into v_team_a_rating
      from public.match_participants mp
      join _run_ratings r on r.player_id = mp.player_id
      where mp.match_id = v_match.match_id and mp.team_id = v_match.team_a_id;

      select coalesce(avg(r.rating), 1000)
      into v_team_b_rating
      from public.match_participants mp
      join _run_ratings r on r.player_id = mp.player_id
      where mp.match_id = v_match.match_id and mp.team_id = v_match.team_b_id;

      v_delta_a := 0;
      v_delta_b := 0;
      if v_is_ended then
        v_expected_a := public._expected_win_rate(v_team_a_rating, v_team_b_rating);
        v_delta_a := public._rating_delta(v_expected_a, case when v_match.winner_team = 'TEAM_A' then 1.0 else 0.0 end);
        v_delta_b := public._rating_delta(1.0 - v_expected_a, case when v_match.winner_team = 'TEAM_B' then 1.0 else 0.0 end);
      end if;

      select coalesce(team_a_score, 0), coalesce(team_b_score, 0)
      into v_a_score, v_b_score
      from public.match_scores
      where match_id = v_match.match_id
      order by set_number asc
      limit 1;
      if not found then
        v_a_score := 0;
        v_b_score := 0;
      end if;

      -- Use shared helper instead of duplicating ~70 lines of CASE expressions.
      -- JOIN back to match_participants to resolve team_id → delta direction.
      insert into public.player_match_results (
        player_id, match_id, session_id, is_winner,
        team_score, opponent_score, base_points, attendance_points,
        score_bonus, strength_bonus, total_weekly_points,
        rating_before, rating_after, rating_delta
      )
      select
        r.player_id, r.match_id, r.session_id, r.is_winner,
        r.team_score, r.opponent_score, r.base_points, r.attendance_points,
        r.score_bonus, r.strength_bonus, r.total_weekly_points,
        case when v_is_ended then rr.rating else null end,
        case when v_is_ended then
          rr.rating + case when mp.team_id = v_match.team_a_id then v_delta_a else v_delta_b end
        else null end,
        case when v_is_ended then
          case when mp.team_id = v_match.team_a_id then v_delta_a else v_delta_b end
        else null end
      from public._compute_match_pmr_rows(
        v_match.match_id, v_session.id, v_match.winner_team,
        v_a_score, v_b_score,
        v_team_a_rating, v_team_b_rating
      ) r
      join public.match_participants mp on mp.player_id = r.player_id and mp.match_id = r.match_id
      join _run_ratings rr on rr.player_id = r.player_id;

      if v_is_ended then
        update _run_ratings
        set rating = rating + v_delta_a
        where player_id in (
          select player_id from public.match_participants
          where match_id = v_match.match_id and team_id = v_match.team_a_id
        );

        update _run_ratings
        set rating = rating + v_delta_b
        where player_id in (
          select player_id from public.match_participants
          where match_id = v_match.match_id and team_id = v_match.team_b_id
        );
      end if;
    end loop;
  end loop;

  update public.players p
  set rating = r.rating
  from _run_ratings r
  where p.id = r.player_id;

  for v_sess_id in select id from public.sessions loop
    perform public.refresh_player_session_stats(v_sess_id);
  end loop;
  perform public.refresh_player_all_time_stats();
end;
$$;
