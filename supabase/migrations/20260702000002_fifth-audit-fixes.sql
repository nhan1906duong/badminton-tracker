-- Phase 13: Fifth Audit Fixes
--
-- 1. _compute_match_pmr_rows — shared scoring helper eliminating ~90-line
--    duplicate in record_result and update_match_players.
-- 2. record_result — use helper.
-- 3. update_match_players — use helper + replace 3 correlated scalar
--    subqueries with a single JOIN.
-- 4. delete_match — remove redundant manual cascade deletes (match_teams,
--    match_participants, match_scores, player_match_results all cascade
--    ON DELETE CASCADE from matches).
-- 5. delete_session — same; sessions → matches → everything cascades.
-- 6. create_league_schedule — replace per-fixture PL/pgSQL loop with a
--    single writable CTE (matches + teams + participants in one statement).
-- 7. get_leaderboard_page — redirect to player_all_time_stats (O(1) read).
-- 8. get_player_ranking_summary — same redirect.

-- ============================================================
-- 1. _compute_match_pmr_rows
-- Returns one row per match participant with all scoring columns computed.
-- Called by record_result and update_match_players instead of duplicating
-- the CASE-heavy expressions in each function body.
-- ============================================================

create or replace function _compute_match_pmr_rows(
  p_match_id      uuid,
  p_session_id    uuid,
  p_winner_team   text,
  p_a_score       int,
  p_b_score       int,
  p_team_a_rating numeric,
  p_team_b_rating numeric
)
returns table (
  player_id           uuid,
  match_id            uuid,
  session_id          uuid,
  is_winner           bool,
  team_score          int,
  opponent_score      int,
  base_points         int,
  attendance_points   int,
  score_bonus         int,
  strength_bonus      int,
  total_weekly_points int
)
language sql
stable
set search_path = ''
as $$
  with parts as (
    select
      mp.player_id,
      mt.team_label,
      (mt.team_label = p_winner_team)                                       as is_winner,
      case when mt.team_label = 'TEAM_A' then p_a_score else p_b_score end  as team_score,
      case when mt.team_label = 'TEAM_A' then p_b_score else p_a_score end  as opp_score,
      case when mt.team_label = p_winner_team then 10 else 3 end             as base_pts,
      1                                                                       as attend_pts,
      case when mt.team_label = p_winner_team
        then public._score_diff_bonus(
          case when mt.team_label = 'TEAM_A' then p_a_score else p_b_score end,
          case when mt.team_label = 'TEAM_A' then p_b_score else p_a_score end
        )
        else public._close_game_bonus(
          case when mt.team_label = 'TEAM_A' then p_a_score else p_b_score end
        )
      end                                                                     as score_bon,
      case when mt.team_label = p_winner_team
        then public._winner_strength_bonus(
          case when mt.team_label = 'TEAM_A' then p_team_a_rating else p_team_b_rating end,
          case when mt.team_label = 'TEAM_A' then p_team_b_rating else p_team_a_rating end
        )
        else public._loser_strength_adj(
          case when mt.team_label = 'TEAM_A' then p_team_a_rating else p_team_b_rating end,
          case when mt.team_label = 'TEAM_A' then p_team_b_rating else p_team_a_rating end
        )
      end                                                                     as strength_bon
    from public.match_participants mp
    join public.match_teams mt on mt.id = mp.team_id
    where mp.match_id = p_match_id
  )
  select
    player_id,
    p_match_id,
    p_session_id,
    is_winner,
    team_score,
    opp_score,
    base_pts,
    attend_pts,
    score_bon,
    strength_bon,
    greatest(1, base_pts + attend_pts + score_bon + strength_bon)
  from parts;
$$;

-- ============================================================
-- 2. record_result — use _compute_match_pmr_rows
-- ============================================================

create or replace function record_result(
  p_id          uuid,
  p_winner_team text,
  p_scores      jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id    uuid;
  v_a_score       int := 0;
  v_b_score       int := 0;
  v_team_a_rating numeric;
  v_team_b_rating numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.matches set status = 'COMPLETED', ended_at = now() where id = p_id;
  update public.match_teams set is_winner = (team_label = p_winner_team) where match_id = p_id;

  delete from public.match_scores where match_id = p_id;

  if p_scores is not null and jsonb_array_length(p_scores) > 0 then
    insert into public.match_scores (match_id, set_number, team_a_score, team_b_score)
    select
      p_id,
      (elem->>'set_number')::int,
      (elem->>'team_a_score')::int,
      (elem->>'team_b_score')::int
    from jsonb_array_elements(p_scores) as elem
    where (elem->>'team_a_score')::int > 0
       or (elem->>'team_b_score')::int > 0;
  end if;

  select session_id into v_session_id from public.matches where id = p_id;

  select
    coalesce(avg(case when mt.team_label = 'TEAM_A' then coalesce(pl.rating, 1000) end), 1000),
    coalesce(avg(case when mt.team_label = 'TEAM_B' then coalesce(pl.rating, 1000) end), 1000)
  into v_team_a_rating, v_team_b_rating
  from public.match_participants mp
  join public.match_teams mt on mt.id = mp.team_id
  join public.players pl on pl.id = mp.player_id
  where mp.match_id = p_id;

  select coalesce(team_a_score, 0), coalesce(team_b_score, 0)
  into v_a_score, v_b_score
  from public.match_scores
  where match_id = p_id
  order by set_number
  limit 1;

  v_a_score := coalesce(v_a_score, 0);
  v_b_score := coalesce(v_b_score, 0);

  insert into public.player_match_results (
    player_id, match_id, session_id, is_winner,
    team_score, opponent_score, base_points, attendance_points,
    score_bonus, strength_bonus, total_weekly_points
  )
  select
    player_id, match_id, session_id, is_winner,
    team_score, opponent_score, base_points, attendance_points,
    score_bonus, strength_bonus, total_weekly_points
  from public._compute_match_pmr_rows(
    p_id, v_session_id, p_winner_team,
    v_a_score, v_b_score,
    v_team_a_rating, v_team_b_rating
  )
  on conflict (player_id, match_id) do update set
    session_id          = excluded.session_id,
    is_winner           = excluded.is_winner,
    team_score          = excluded.team_score,
    opponent_score      = excluded.opponent_score,
    base_points         = excluded.base_points,
    attendance_points   = excluded.attendance_points,
    score_bonus         = excluded.score_bonus,
    strength_bonus      = excluded.strength_bonus,
    total_weekly_points = excluded.total_weekly_points;

  perform public.refresh_player_session_stats(v_session_id);
end;
$$;

-- ============================================================
-- 3. update_match_players — use helper + single JOIN for team IDs
-- ============================================================

create or replace function update_match_players(
  p_id                uuid,
  p_team_a_player_ids uuid[],
  p_team_b_player_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id    uuid;
  v_status        text;
  v_team_a_id     uuid;
  v_team_b_id     uuid;
  v_winner_team   text;
  v_a_score       int := 0;
  v_b_score       int := 0;
  v_team_a_rating numeric;
  v_team_b_rating numeric;
  v_all_ids       uuid[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_all_ids := p_team_a_player_ids || p_team_b_player_ids;
  if (select count(distinct pid) from unnest(v_all_ids) as pid)
      != array_length(v_all_ids, 1) then
    raise exception 'A player can only appear once in a match.';
  end if;

  -- Single JOIN replaces three correlated scalar subqueries
  select
    m.session_id,
    m.status,
    max(mt.id) filter (where mt.team_label = 'TEAM_A'),
    max(mt.id) filter (where mt.team_label = 'TEAM_B'),
    max(mt.team_label) filter (where mt.is_winner)
  into v_session_id, v_status, v_team_a_id, v_team_b_id, v_winner_team
  from public.matches m
  join public.match_teams mt on mt.match_id = m.id
  where m.id = p_id
  group by m.session_id, m.status;

  delete from public.match_participants where match_id = p_id;

  insert into public.match_participants (match_id, team_id, player_id)
  select p_id, v_team_a_id, unnest(p_team_a_player_ids)
  union all
  select p_id, v_team_b_id, unnest(p_team_b_player_ids);

  delete from public.player_match_results where match_id = p_id;

  if v_status = 'COMPLETED' and v_winner_team is not null then
    select
      coalesce(avg(case when id = any(p_team_a_player_ids) then coalesce(rating, 1000) end), 1000),
      coalesce(avg(case when id = any(p_team_b_player_ids) then coalesce(rating, 1000) end), 1000)
    into v_team_a_rating, v_team_b_rating
    from public.players
    where id = any(v_all_ids);

    select coalesce(team_a_score, 0), coalesce(team_b_score, 0)
    into v_a_score, v_b_score
    from public.match_scores
    where match_id = p_id
    order by set_number
    limit 1;

    v_a_score := coalesce(v_a_score, 0);
    v_b_score := coalesce(v_b_score, 0);

    insert into public.player_match_results (
      player_id, match_id, session_id, is_winner,
      team_score, opponent_score, base_points, attendance_points,
      score_bonus, strength_bonus, total_weekly_points
    )
    select
      player_id, match_id, session_id, is_winner,
      team_score, opponent_score, base_points, attendance_points,
      score_bonus, strength_bonus, total_weekly_points
    from public._compute_match_pmr_rows(
      p_id, v_session_id, v_winner_team,
      v_a_score, v_b_score,
      v_team_a_rating, v_team_b_rating
    );
  end if;

  perform public.refresh_player_session_stats(v_session_id);
end;
$$;

-- ============================================================
-- 4. delete_match — remove redundant cascade deletes
-- match_teams, match_participants, match_scores, player_match_results
-- all carry ON DELETE CASCADE from matches. Only the matches DELETE
-- and subsequent stat refreshes are needed.
-- ============================================================

create or replace function delete_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Admin required';
  end if;

  select session_id into v_session_id
  from public.matches where id = p_match_id;

  delete from public.matches where id = p_match_id;

  if v_session_id is not null then
    perform public.refresh_player_session_stats(v_session_id);
  end if;
  perform public.refresh_player_all_time_stats();
end;
$$;

-- ============================================================
-- 5. delete_session — remove redundant cascade deletes
-- sessions → matches → (match_teams, match_participants, match_scores,
-- player_match_results) all cascade. Only the sessions DELETE is needed.
-- ============================================================

create or replace function delete_session(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Admin required';
  end if;

  delete from public.sessions where id = p_id;
  perform public.refresh_player_all_time_stats();
end;
$$;

-- ============================================================
-- 6. create_league_schedule — batch CTE replacing per-fixture loop
--
-- Original: N fixtures × 3 INSERT statements in a PL/pgSQL FOR loop.
-- New: one writable CTE inserts all matches, teams, and participants
-- in a single SQL statement. Dependency chain:
--   fixture_rows (parse JSON)
--   → new_matches (INSERT matches, RETURNING ids)
--   → match_fixture (correlate ids ↔ player arrays via queue+round)
--   → new_teams (INSERT match_teams for TEAM_A + TEAM_B via CROSS JOIN)
--   → new_participants (INSERT match_participants via unnest of player arrays)
-- ============================================================

create or replace function create_league_schedule(
  p_session_id  uuid,
  p_match_type  text,
  p_played_at   timestamptz,
  p_fixtures    jsonb
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  with
  fixture_rows as (
    select
      (f->>'queuePosition')::int  as queue_position,
      (f->>'round')::int          as league_round,
      array(
        select e::uuid
        from jsonb_array_elements_text(f->'teamAPlayerIds') as e
      )                           as team_a_ids,
      array(
        select e::uuid
        from jsonb_array_elements_text(f->'teamBPlayerIds') as e
      )                           as team_b_ids
    from jsonb_array_elements(p_fixtures) as f
  ),
  new_matches as (
    insert into public.matches (
      session_id, match_type, played_at, status,
      queue_position, league_round, created_by
    )
    select
      p_session_id, p_match_type, p_played_at, 'SCHEDULED',
      queue_position, league_round, auth.uid()
    from fixture_rows
    returning id as match_id, queue_position, league_round
  ),
  -- Correlate new match IDs back to their player arrays via (queue_position, league_round).
  -- These are unique per schedule call because each fixture occupies a distinct slot.
  match_fixture as (
    select nm.match_id, fr.team_a_ids, fr.team_b_ids
    from new_matches nm
    join fixture_rows fr
      on fr.queue_position = nm.queue_position
     and fr.league_round   = nm.league_round
  ),
  new_teams as (
    insert into public.match_teams (match_id, team_label, is_winner)
    select mf.match_id, labels.label, false
    from match_fixture mf
    cross join (values ('TEAM_A'::text), ('TEAM_B'::text)) as labels(label)
    returning id as team_id, match_id, team_label
  ),
  new_participants as (
    insert into public.match_participants (match_id, team_id, player_id)
    select
      nt.match_id,
      nt.team_id,
      unnest(
        case when nt.team_label = 'TEAM_A'
          then mf.team_a_ids
          else mf.team_b_ids
        end
      )
    from new_teams nt
    join match_fixture mf on mf.match_id = nt.match_id
    returning 1 as x
  )
  select count(*)::int into v_count from new_matches;

  return v_count;
end;
$$;

-- ============================================================
-- 7. get_leaderboard_page — O(1) read from player_all_time_stats
-- Previously aggregated player_match_results on every call.
-- player_all_time_stats is refreshed by refresh_player_all_time_stats()
-- after every session end, match delete, or full recalculation.
-- ============================================================

create or replace function get_leaderboard_page(
  p_limit  int default 50,
  p_offset int default 0
)
returns table (
  player_id           uuid,
  name                text,
  avatar_url          text,
  rating              int,
  rank                bigint,
  matches_played      bigint,
  wins                bigint,
  losses              bigint,
  win_rate            float,
  total_weekly_points bigint,
  avg_weekly_points   float,
  points_for          bigint,
  points_against      bigint,
  point_difference    bigint,
  total_rating_delta  float,
  last_session_delta  float,
  rank_change         int,
  top_one_week_streak int
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.name,
    p.avatar_url,
    coalesce(p.rating, 1000),
    pats.all_time_rank::bigint,
    pats.matches_played::bigint,
    pats.wins::bigint,
    pats.losses::bigint,
    pats.win_rate,
    pats.total_weekly_points,
    pats.avg_weekly_points,
    pats.points_for,
    pats.points_against,
    pats.point_difference,
    pats.total_rating_delta,
    pats.last_session_delta,
    pats.rank_change,
    pats.top_one_week_streak
  from public.player_all_time_stats pats
  join public.players p on p.id = pats.player_id
  order by pats.all_time_rank
  limit p_limit offset p_offset;
$$;

-- ============================================================
-- 8. get_player_ranking_summary — O(1) read from player_all_time_stats
-- Previously did a lateral aggregation over player_match_results + a
-- correlated count(*) subquery over players for the rank computation.
-- ============================================================

create or replace function get_player_ranking_summary(p_player_id uuid)
returns json
language sql
stable
security invoker
set search_path = ''
as $$
  select json_build_object(
    'playerId',              p.id,
    'name',                  p.name,
    'avatarUrl',             p.avatar_url,
    'rating',                coalesce(p.rating, 1000),
    'rank',                  coalesce(pats.all_time_rank, (
                               select count(*) + 1
                               from public.players p2
                               where coalesce(p2.rating, 1000) > coalesce(p.rating, 1000)
                             )),
    'matchesPlayed',         coalesce(pats.matches_played, 0),
    'wins',                  coalesce(pats.wins, 0),
    'losses',                coalesce(pats.losses, 0),
    'winRate',               coalesce(pats.win_rate, 0),
    'totalWeeklyPoints',     coalesce(pats.total_weekly_points, 0),
    'averageWeeklyPoints',   coalesce(pats.avg_weekly_points, 0),
    'pointsFor',             coalesce(pats.points_for, 0),
    'pointsAgainst',         coalesce(pats.points_against, 0),
    'pointDifference',       coalesce(pats.point_difference, 0),
    'totalRatingDelta',      coalesce(pats.total_rating_delta, 0),
    'lastSessionRatingDelta', coalesce(pats.last_session_delta, 0),
    'rankChange',            coalesce(pats.rank_change, 0),
    'topOneWeekStreak',      coalesce(pats.top_one_week_streak, 0)
  )
  from public.players p
  left join public.player_all_time_stats pats on pats.player_id = p.id
  where p.id = p_player_id;
$$;
