-- Phase 8: Fix SET search_path = public → SET search_path = '' on all remaining
-- SECURITY DEFINER functions. set search_path = '' prevents a user who can CREATE
-- in public from shadowing tables or functions used in auth/admin checks.
-- All object references are fully qualified with public. after this change.
-- Covers: stat refresh helpers, player/session/match CRUD, league, rating RPCs.

-- ============================================================
-- Helper: math-only helpers (not SECURITY DEFINER but fix for consistency)
-- ============================================================

create or replace function _rating_delta(
  p_expected numeric,
  p_actual   numeric,
  p_k        int default 32
) returns int
language sql immutable
set search_path = ''
as $$
  select floor(p_k * (p_actual - p_expected) + 0.5)::int;
$$;

create or replace function _expected_win_rate(
  p_team_rating numeric,
  p_opp_rating  numeric
) returns numeric
language sql immutable
set search_path = ''
as $$
  select 1.0 / (1.0 + power(10.0, (p_opp_rating - p_team_rating) / 400.0));
$$;

-- ============================================================
-- Materialized stat helpers
-- ============================================================

create or replace function refresh_player_session_stats(p_session_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  with session_stats as (
    -- total_matches + total_wins per player using JOIN instead of EXISTS
    select
      mp.player_id,
      count(distinct m.id)::int                                        as total_matches,
      count(distinct case when mt.is_winner = true then m.id end)::int as total_wins
    from public.matches m
    join public.match_participants mp on mp.match_id = m.id
    join public.match_teams mt        on mt.id = mp.team_id
    join public.match_teams wt        on wt.match_id = m.id and wt.is_winner = true
    where m.session_id = p_session_id
      and m.status = 'COMPLETED'
    group by mp.player_id
  ),
  session_points as (
    select
      player_id,
      coalesce(sum(total_weekly_points), 0)::int as total_weekly_points,
      coalesce(sum(team_score),          0)::int as points_for,
      coalesce(sum(opponent_score),      0)::int as points_against,
      coalesce(sum(rating_delta),        0)      as total_rating_delta
    from public.player_match_results
    where session_id = p_session_id
    group by player_id
  ),
  combined as (
    select
      ss.player_id,
      ss.total_matches,
      ss.total_wins,
      coalesce(sp.total_weekly_points, 0) as total_weekly_points,
      coalesce(sp.points_for,          0) as points_for,
      coalesce(sp.points_against,      0) as points_against,
      coalesce(sp.total_rating_delta,  0) as total_rating_delta
    from session_stats ss
    left join session_points sp on sp.player_id = ss.player_id
  ),
  ranked as (
    select
      player_id,
      total_matches,
      total_wins,
      total_weekly_points,
      points_for,
      points_against,
      total_rating_delta,
      rank() over (
        order by
          total_weekly_points desc,
          case when total_matches > 0 then total_weekly_points::float / total_matches else 0 end desc,
          total_wins desc,
          (points_for - points_against) desc
      )::int as session_rank
    from combined
  )
  insert into public.player_session_stats (
    session_id, player_id,
    total_matches, total_wins,
    total_weekly_points, points_for, points_against, total_rating_delta,
    session_rank, updated_at
  )
  select
    p_session_id, player_id,
    total_matches, total_wins,
    total_weekly_points, points_for, points_against, total_rating_delta,
    session_rank, now()
  from ranked
  on conflict (session_id, player_id) do update
    set total_matches        = excluded.total_matches,
        total_wins           = excluded.total_wins,
        total_weekly_points  = excluded.total_weekly_points,
        points_for           = excluded.points_for,
        points_against       = excluded.points_against,
        total_rating_delta   = excluded.total_rating_delta,
        session_rank         = excluded.session_rank,
        updated_at           = now();
$$;

create or replace function refresh_player_all_time_stats()
returns void
language sql
security definer
set search_path = ''
as $$
  with ended_sessions as (
    select id from public.sessions where ended_at is not null
  ),
  player_stats as (
    select
      pmr.player_id,
      count(distinct pmr.match_id)::int                              as matches_played,
      count(*) filter (where pmr.is_winner)::int                     as wins,
      count(*) filter (where not pmr.is_winner)::int                 as losses,
      sum(pmr.total_weekly_points)                                   as total_weekly_points,
      sum(pmr.team_score)                                            as points_for,
      sum(pmr.opponent_score)                                        as points_against,
      sum(coalesce(pmr.rating_delta, 0))                             as total_rating_delta
    from public.player_match_results pmr
    where pmr.session_id in (select id from ended_sessions)
    group by pmr.player_id
  ),
  all_players as (
    select
      p.id                                                               as player_id,
      coalesce(p.rating, 1000)                                           as rating,
      coalesce(ps.matches_played, 0)                                     as matches_played,
      coalesce(ps.wins, 0)                                               as wins,
      coalesce(ps.losses, 0)                                             as losses,
      case when coalesce(ps.matches_played, 0) > 0
        then ps.wins::float / ps.matches_played else 0 end               as win_rate,
      coalesce(ps.total_weekly_points, 0)                                as total_weekly_points,
      case when coalesce(ps.matches_played, 0) > 0
        then ps.total_weekly_points::float / ps.matches_played else 0 end as avg_weekly_points,
      coalesce(ps.points_for, 0)                                         as points_for,
      coalesce(ps.points_against, 0)                                     as points_against,
      coalesce(ps.points_for, 0) - coalesce(ps.points_against, 0)       as point_difference,
      coalesce(ps.total_rating_delta, 0)                                 as total_rating_delta
    from public.players p
    left join player_stats ps on ps.player_id = p.id
  ),
  ranked as (
    select
      *,
      rank() over (
        order by
          rating desc,
          avg_weekly_points desc,
          win_rate desc,
          point_difference desc
      )::int as all_time_rank
    from all_players
  )
  insert into public.player_all_time_stats (
    player_id, all_time_rank, matches_played, wins, losses, win_rate,
    total_weekly_points, avg_weekly_points, points_for, points_against,
    point_difference, total_rating_delta, updated_at
  )
  select
    player_id, all_time_rank, matches_played, wins, losses, win_rate,
    total_weekly_points, avg_weekly_points, points_for, points_against,
    point_difference, total_rating_delta, now()
  from ranked
  on conflict (player_id) do update
    set all_time_rank       = excluded.all_time_rank,
        matches_played      = excluded.matches_played,
        wins                = excluded.wins,
        losses              = excluded.losses,
        win_rate            = excluded.win_rate,
        total_weekly_points = excluded.total_weekly_points,
        avg_weekly_points   = excluded.avg_weekly_points,
        points_for          = excluded.points_for,
        points_against      = excluded.points_against,
        point_difference    = excluded.point_difference,
        total_rating_delta  = excluded.total_rating_delta,
        updated_at          = now();
$$;

-- ============================================================
-- Player CRUD
-- ============================================================

create or replace function create_player(
  p_name  text,
  p_email text default null
)
returns setof public.players
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
    insert into public.players (name, email, created_by)
    values (p_name, p_email, auth.uid())
    returning *;
end;
$$;

create or replace function update_player(
  p_id               uuid,
  p_name             text    default null,
  p_email            text    default null,
  p_avatar_url       text    default null,
  p_active_racket_id uuid    default null,
  p_clear_avatar     bool    default false
)
returns setof public.players
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
    update public.players
    set
      name             = coalesce(p_name, name),
      email            = coalesce(p_email, email),
      avatar_url       = case
                           when p_clear_avatar then null
                           when p_avatar_url is not null then p_avatar_url
                           else avatar_url
                         end,
      active_racket_id = coalesce(p_active_racket_id, active_racket_id)
    where id = p_id
    returning *;
end;
$$;

create or replace function delete_player(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin') then
    raise exception 'Admin required';
  end if;

  delete from public.match_participants where player_id = p_id;
  delete from public.players where id = p_id;
end;
$$;

-- ============================================================
-- Session CRUD
-- ============================================================

create or replace function create_session(
  p_type               text,
  p_label              text        default null,
  p_started_at         timestamptz default null,
  p_bwf_tournament_id  uuid        default null,
  p_league_match_type  text        default null,
  p_league_total_rounds int        default null
)
returns setof public.sessions
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_type = 'league' and (p_league_match_type is null or p_league_total_rounds is null) then
    raise exception 'League session requires match type and round count';
  end if;

  if p_bwf_tournament_id is not null and exists (
    select 1 from public.sessions where bwf_tournament_id = p_bwf_tournament_id
  ) then
    raise exception 'A session for this tournament already exists.';
  end if;

  return query
    insert into public.sessions (
      type, label, started_at, bwf_tournament_id,
      league_match_type, league_total_rounds, created_by
    )
    values (
      p_type, p_label, coalesce(p_started_at, now()), p_bwf_tournament_id,
      p_league_match_type, p_league_total_rounds, auth.uid()
    )
    returning *;
end;
$$;

create or replace function start_session(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.sessions set started_at = now() where id = p_id;
end;
$$;

create or replace function update_session_start_time(
  p_id         uuid,
  p_started_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.sessions set started_at = p_started_at where id = p_id;
end;
$$;

create or replace function rename_session(p_id uuid, p_label text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.sessions set label = nullif(trim(p_label), '') where id = p_id;
end;
$$;

create or replace function update_league_total_rounds(p_id uuid, p_rounds int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.sessions set league_total_rounds = p_rounds where id = p_id;
end;
$$;

-- ============================================================
-- Attendance + profile link
-- ============================================================

create or replace function upsert_attendance(
  p_session_id uuid,
  p_player_id  uuid,
  p_status     text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.session_attendances (session_id, player_id, status, updated_at)
  values (p_session_id, p_player_id, p_status::public.attendance_status, now())
  on conflict (session_id, player_id)
  do update set status = excluded.status, updated_at = now();
end;
$$;

create or replace function delete_attendance(
  p_session_id uuid,
  p_player_id  uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.session_attendances
  where session_id = p_session_id and player_id = p_player_id;
end;
$$;

create or replace function update_player_link(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles set player_id = p_player_id where id = auth.uid();
end;
$$;

create or replace function clear_player_link()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles set player_id = null where id = auth.uid();
end;
$$;

-- ============================================================
-- Match lifecycle
-- ============================================================

create or replace function create_match(
  p_session_id        uuid,
  p_match_type        text,
  p_played_at         timestamptz,
  p_team_a_player_ids uuid[],
  p_team_b_player_ids uuid[],
  p_notes             text  default null,
  p_status            text  default 'SCHEDULED',
  p_queue_position    int   default null,
  p_league_round      int   default null,
  p_winner_team       text  default null,
  p_scores            jsonb default null
)
returns setof public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match_id  uuid;
  v_team_a_id uuid;
  v_team_b_id uuid;
  v_score     jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.matches (
    session_id, match_type, played_at, notes, status,
    queue_position, league_round, created_by
  ) values (
    p_session_id, p_match_type, p_played_at, p_notes, p_status,
    p_queue_position, p_league_round, auth.uid()
  )
  returning id into v_match_id;

  insert into public.match_teams (match_id, team_label, is_winner)
    values (v_match_id, 'TEAM_A', p_winner_team = 'TEAM_A')
    returning id into v_team_a_id;

  insert into public.match_teams (match_id, team_label, is_winner)
    values (v_match_id, 'TEAM_B', p_winner_team = 'TEAM_B')
    returning id into v_team_b_id;

  insert into public.match_participants (match_id, team_id, player_id)
    select v_match_id, v_team_a_id, unnest(p_team_a_player_ids);

  insert into public.match_participants (match_id, team_id, player_id)
    select v_match_id, v_team_b_id, unnest(p_team_b_player_ids);

  if p_scores is not null then
    for v_score in select * from jsonb_array_elements(p_scores) loop
      if (v_score->>'team_a_score')::int > 0 or (v_score->>'team_b_score')::int > 0 then
        insert into public.match_scores (match_id, set_number, team_a_score, team_b_score)
          values (
            v_match_id,
            (v_score->>'set_number')::int,
            (v_score->>'team_a_score')::int,
            (v_score->>'team_b_score')::int
          );
      end if;
    end loop;
  end if;

  return query select * from public.matches where id = v_match_id;
end;
$$;

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
  v_fixture       jsonb;
  v_match_id      uuid;
  v_team_a_id     uuid;
  v_team_b_id     uuid;
  v_count         int := 0;
  v_team_a_ids    uuid[];
  v_team_b_ids    uuid[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  for v_fixture in select * from jsonb_array_elements(p_fixtures) loop
    select array_agg(elem::uuid)
      into v_team_a_ids
      from jsonb_array_elements_text(v_fixture->'teamAPlayerIds') as elem;

    select array_agg(elem::uuid)
      into v_team_b_ids
      from jsonb_array_elements_text(v_fixture->'teamBPlayerIds') as elem;

    insert into public.matches (
      session_id, match_type, played_at, status,
      queue_position, league_round, created_by
    ) values (
      p_session_id, p_match_type, p_played_at, 'SCHEDULED',
      (v_fixture->>'queuePosition')::int,
      (v_fixture->>'round')::int,
      auth.uid()
    )
    returning id into v_match_id;

    insert into public.match_teams (match_id, team_label, is_winner)
      values (v_match_id, 'TEAM_A', false)
      returning id into v_team_a_id;

    insert into public.match_teams (match_id, team_label, is_winner)
      values (v_match_id, 'TEAM_B', false)
      returning id into v_team_b_id;

    insert into public.match_participants (match_id, team_id, player_id)
      select v_match_id, v_team_a_id, unnest(v_team_a_ids);

    insert into public.match_participants (match_id, team_id, player_id)
      select v_match_id, v_team_b_id, unnest(v_team_b_ids);

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function start_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.matches
    set status = 'LIVE', queue_position = null, played_at = now()
    where id = p_match_id;
end;
$$;

create or replace function reopen_match(p_match_id uuid)
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

  update public.matches
    set status = 'LIVE'
    where id = p_match_id;

  select session_id into v_session_id from public.matches where id = p_match_id;

  perform public.refresh_player_session_stats(v_session_id);
end;
$$;

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

  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin') then
    raise exception 'Admin required';
  end if;

  select session_id into v_session_id from public.matches where id = p_match_id;

  delete from public.match_scores       where match_id = p_match_id;
  delete from public.match_participants where match_id = p_match_id;
  delete from public.match_teams        where match_id = p_match_id;
  delete from public.player_match_results where match_id = p_match_id;
  delete from public.matches            where id = p_match_id;

  if v_session_id is not null then
    perform public.refresh_player_session_stats(v_session_id);
  end if;
  perform public.refresh_player_all_time_stats();
end;
$$;

create or replace function reorder_queue(p_updates jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.matches m
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

-- ============================================================
-- League team RPCs
-- ============================================================

create or replace function create_league_team(
  p_session_id uuid,
  p_name       text,
  p_player_ids uuid[]
)
returns setof public.league_teams
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.league_teams (session_id, name)
  values (p_session_id, p_name)
  returning id into v_team_id;

  if array_length(p_player_ids, 1) > 0 then
    insert into public.league_team_players (league_team_id, player_id)
    select v_team_id, unnest(p_player_ids);
  end if;

  return query select * from public.league_teams where id = v_team_id;
end;
$$;

create or replace function update_league_team(
  p_team_id    uuid,
  p_session_id uuid,
  p_name       text    default null,
  p_player_ids uuid[]  default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prev_ids uuid[];
  v_match    record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is not null then
    update public.league_teams set name = p_name where id = p_team_id;
  end if;

  if p_player_ids is not null then
    select array_agg(player_id)
    into v_prev_ids
    from public.league_team_players
    where league_team_id = p_team_id;

    delete from public.league_team_players where league_team_id = p_team_id;

    if array_length(p_player_ids, 1) > 0 then
      insert into public.league_team_players (league_team_id, player_id)
      select p_team_id, unnest(p_player_ids);
    end if;

    for v_match in
      select m.id as match_id, mt.id as team_id
      from public.matches m
      join public.match_teams mt on mt.match_id = m.id
      where m.session_id = p_session_id
        and m.status = 'SCHEDULED'
        and (
          select array_agg(mp.player_id order by mp.player_id)
          from public.match_participants mp
          where mp.team_id = mt.id
        ) is not distinct from (
          select array_agg(pid order by pid)
          from unnest(v_prev_ids) as pid
        )
    loop
      delete from public.match_participants where team_id = v_match.team_id;

      if array_length(p_player_ids, 1) > 0 then
        insert into public.match_participants (match_id, team_id, player_id)
        select v_match.match_id, v_match.team_id, unnest(p_player_ids);
      end if;
    end loop;
  end if;
end;
$$;

create or replace function delete_league_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin') then
    raise exception 'Admin role required';
  end if;

  delete from public.league_teams where id = p_team_id;
end;
$$;

-- ============================================================
-- Complex match state RPCs
-- ============================================================

create or replace function update_match(
  p_id          uuid,
  p_match_type  text,
  p_played_at   timestamptz,
  p_winner_team text,
  p_scores      jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.matches
  set match_type = p_match_type,
      played_at  = p_played_at
  where id = p_id;

  update public.match_teams
  set is_winner = (p_winner_team = 'TEAM_A')
  where match_id = p_id and team_label = 'TEAM_A';

  update public.match_teams
  set is_winner = (p_winner_team = 'TEAM_B')
  where match_id = p_id and team_label = 'TEAM_B';

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
end;
$$;

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

  select team_a_score, team_b_score
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
    mp.player_id,
    p_id,
    v_session_id,
    (mt.team_label = p_winner_team),
    case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
    case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end,
    case when mt.team_label = p_winner_team then 10 else 3 end,
    1,
    case when mt.team_label = p_winner_team
      then public._score_diff_bonus(
        case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
        case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end
      )
      else public._close_game_bonus(
        case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end
      )
    end,
    case when mt.team_label = p_winner_team
      then public._winner_strength_bonus(
        case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
        case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
      )
      else public._loser_strength_adj(
        case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
        case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
      )
    end,
    greatest(1,
      case when mt.team_label = p_winner_team then 10 else 3 end
      + 1
      + case when mt.team_label = p_winner_team
          then public._score_diff_bonus(
            case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
            case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end
          )
          else public._close_game_bonus(
            case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end
          )
        end
      + case when mt.team_label = p_winner_team
          then public._winner_strength_bonus(
            case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
            case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
          )
          else public._loser_strength_adj(
            case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
            case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
          )
        end
    )
  from public.match_participants mp
  join public.match_teams mt on mt.id = mp.team_id
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

  perform public.refresh_player_session_stats(v_session_id);
end;
$$;

create or replace function end_match_no_winner(
  p_id     uuid,
  p_scores jsonb
)
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

  update public.matches set status = 'COMPLETED', ended_at = now() where id = p_id;
  update public.match_teams set is_winner = false where match_id = p_id;
  delete from public.player_match_results where match_id = p_id;
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
  perform public.refresh_player_session_stats(v_session_id);
end;
$$;

create or replace function update_match_players(
  p_id                 uuid,
  p_team_a_player_ids  uuid[],
  p_team_b_player_ids  uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
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
    (select id from public.match_teams where match_id = m.id and team_label = 'TEAM_A'),
    (select id from public.match_teams where match_id = m.id and team_label = 'TEAM_B'),
    (select team_label from public.match_teams where match_id = m.id and is_winner = true)
  into v_session_id, v_status, v_team_a_id, v_team_b_id, v_winner_team
  from public.matches m
  where m.id = p_id;

  delete from public.match_participants where match_id = p_id;

  insert into public.match_participants (match_id, team_id, player_id)
  select p_id, v_team_a_id, unnest(p_team_a_player_ids)
  union all
  select p_id, v_team_b_id, unnest(p_team_b_player_ids);

  delete from public.player_match_results where match_id = p_id;

  if v_status = 'COMPLETED' and v_winner_team is not null then
    select
      coalesce(avg(case when pl_id = any(p_team_a_player_ids) then coalesce(pl.rating, 1000) end), 1000),
      coalesce(avg(case when pl_id = any(p_team_b_player_ids) then coalesce(pl.rating, 1000) end), 1000)
    into v_team_a_rating, v_team_b_rating
    from (
      select id as pl_id, rating from public.players
      where id = any(v_all_ids)
    ) pl;

    select team_a_score, team_b_score
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
      mp.player_id,
      p_id,
      v_session_id,
      (mt.team_label = v_winner_team),
      case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
      case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end,
      case when mt.team_label = v_winner_team then 10 else 3 end,
      1,
      case when mt.team_label = v_winner_team
        then public._score_diff_bonus(
          case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
          case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end
        )
        else public._close_game_bonus(
          case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end
        )
      end,
      case when mt.team_label = v_winner_team
        then public._winner_strength_bonus(
          case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
          case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
        )
        else public._loser_strength_adj(
          case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
          case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
        )
      end,
      greatest(1,
        case when mt.team_label = v_winner_team then 10 else 3 end
        + 1
        + case when mt.team_label = v_winner_team
            then public._score_diff_bonus(
              case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
              case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end
            )
            else public._close_game_bonus(
              case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end
            )
          end
        + case when mt.team_label = v_winner_team
            then public._winner_strength_bonus(
              case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
              case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
            )
            else public._loser_strength_adj(
              case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
              case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
            )
          end
      )
    from public.match_participants mp
    join public.match_teams mt on mt.id = mp.team_id
    where mp.match_id = p_id;
  end if;

  perform public.refresh_player_session_stats(v_session_id);
end;
$$;

-- ============================================================
-- Session rating RPCs
-- ============================================================

create or replace function end_session(p_id uuid)
returns setof public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match         record;
  v_team_a_rating numeric;
  v_team_b_rating numeric;
  v_expected_a    numeric;
  v_delta_a       int;
  v_delta_b       int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  create temp table _ratings on commit drop as
  select distinct mp.player_id,
    coalesce(pl.rating, 1000)::numeric as rating
  from public.matches m
  join public.match_participants mp on mp.match_id = m.id
  join public.players pl on pl.id = mp.player_id
  where m.session_id = p_id
    and m.status = 'COMPLETED';

  create temp table _matches on commit drop as
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
    from public.match_participants mp
    join _ratings r on r.player_id = mp.player_id
    where mp.match_id = v_match.match_id
      and mp.team_id = v_match.team_a_id;

    select coalesce(avg(r.rating), 1000)
    into v_team_b_rating
    from public.match_participants mp
    join _ratings r on r.player_id = mp.player_id
    where mp.match_id = v_match.match_id
      and mp.team_id = v_match.team_b_id;

    v_expected_a := public._expected_win_rate(v_team_a_rating, v_team_b_rating);
    v_delta_a := public._rating_delta(v_expected_a, case when v_match.winner_team = 'TEAM_A' then 1.0 else 0.0 end);
    v_delta_b := public._rating_delta(1.0 - v_expected_a, case when v_match.winner_team = 'TEAM_B' then 1.0 else 0.0 end);

    update public.player_match_results pmr
    set
      rating_before = r.rating,
      rating_after  = r.rating + case when mp.team_id = v_match.team_a_id then v_delta_a else v_delta_b end,
      rating_delta  = case when mp.team_id = v_match.team_a_id then v_delta_a else v_delta_b end
    from public.match_participants mp
    join _ratings r on r.player_id = mp.player_id
    where pmr.player_id = mp.player_id
      and pmr.match_id = v_match.match_id
      and mp.match_id = v_match.match_id;

    update _ratings
    set rating = rating + v_delta_a
    where player_id in (
      select player_id from public.match_participants
      where match_id = v_match.match_id and team_id = v_match.team_a_id
    );

    update _ratings
    set rating = rating + v_delta_b
    where player_id in (
      select player_id from public.match_participants
      where match_id = v_match.match_id and team_id = v_match.team_b_id
    );
  end loop;

  update public.players p
  set rating = r.rating
  from _ratings r
  where p.id = r.player_id;

  update public.sessions set ended_at = now() where id = p_id;

  perform public.refresh_player_session_stats(p_id);
  perform public.refresh_player_all_time_stats();

  return query select * from public.sessions where id = p_id;
end;
$$;

create or replace function delete_session(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin') then
    raise exception 'Admin required';
  end if;

  select array_agg(id) into v_match_ids
  from public.matches
  where session_id = p_id;

  if v_match_ids is not null then
    delete from public.match_scores          where match_id = any(v_match_ids);
    delete from public.match_participants    where match_id = any(v_match_ids);
    delete from public.match_teams           where match_id = any(v_match_ids);
    delete from public.player_match_results  where match_id = any(v_match_ids);
    delete from public.matches               where id = any(v_match_ids);
  end if;

  delete from public.sessions where id = p_id;
  perform public.refresh_player_all_time_stats();
end;
$$;

create or replace function recalculate_all_ratings()
returns void
language plpgsql
security definer
set search_path = ''
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

      insert into public.player_match_results (
        player_id, match_id, session_id, is_winner,
        team_score, opponent_score, base_points, attendance_points,
        score_bonus, strength_bonus, total_weekly_points,
        rating_before, rating_after, rating_delta
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
        case when mt.team_label = v_match.winner_team then
            public._score_diff_bonus(
              case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
              case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end
            )
          else
            public._close_game_bonus(
              case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end
            )
        end,
        case when mt.team_label = v_match.winner_team then
            public._winner_strength_bonus(
              case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
              case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
            )
          else
            public._loser_strength_adj(
              case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
              case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
            )
        end,
        greatest(1,
          case when mt.team_label = v_match.winner_team then 10 else 3 end
          + 1
          + case when mt.team_label = v_match.winner_team then
                public._score_diff_bonus(
                  case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end,
                  case when mt.team_label = 'TEAM_A' then v_b_score else v_a_score end
                )
              else
                public._close_game_bonus(
                  case when mt.team_label = 'TEAM_A' then v_a_score else v_b_score end
                )
            end
          + case when mt.team_label = v_match.winner_team then
                public._winner_strength_bonus(
                  case when mt.team_label = 'TEAM_A' then v_team_a_rating else v_team_b_rating end,
                  case when mt.team_label = 'TEAM_A' then v_team_b_rating else v_team_a_rating end
                )
              else
                public._loser_strength_adj(
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
      from public.match_participants mp
      join public.match_teams mt on mt.id = mp.team_id
      join _run_ratings r on r.player_id = mp.player_id
      where mp.match_id = v_match.match_id;

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

create or replace function clear_all_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin') then
    raise exception 'Admin required';
  end if;

  delete from public.match_scores;
  delete from public.match_participants;
  delete from public.match_teams;
  delete from public.player_match_results;
  delete from public.league_team_players;
  delete from public.league_teams;
  delete from public.matches;
  delete from public.sessions;
  delete from public.players;

  update public.profiles set avatar_url = null;
end;
$$;
