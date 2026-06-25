-- Phase 2 match-lifecycle RPCs
-- create_match, create_league_schedule, start_match, reopen_match, delete_match, reorder_queue

-- ---------------------------------------------------------------------------
-- 1. create_match
-- Atomically inserts a match + teams + participants + optional scores.
-- Returns the created matches row.
-- ---------------------------------------------------------------------------
create or replace function create_match(
  p_session_id      uuid,
  p_match_type      text,
  p_played_at       timestamptz,
  p_notes           text default null,
  p_status          text default 'SCHEDULED',
  p_queue_position  int  default null,
  p_league_round    int  default null,
  p_team_a_player_ids uuid[],
  p_team_b_player_ids uuid[],
  p_winner_team     text default null,   -- 'TEAM_A' | 'TEAM_B' | null
  p_scores          jsonb default null   -- array of {set_number, team_a_score, team_b_score}
)
returns setof matches
language plpgsql
security definer
set search_path = public
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

  -- 1. Insert match row
  insert into matches (
    session_id, match_type, played_at, notes, status,
    queue_position, league_round, created_by
  ) values (
    p_session_id, p_match_type, p_played_at, p_notes, p_status,
    p_queue_position, p_league_round, auth.uid()
  )
  returning id into v_match_id;

  -- 2. Insert teams, capture their IDs
  insert into match_teams (match_id, team_label, is_winner)
    values (v_match_id, 'TEAM_A', p_winner_team = 'TEAM_A')
    returning id into v_team_a_id;

  insert into match_teams (match_id, team_label, is_winner)
    values (v_match_id, 'TEAM_B', p_winner_team = 'TEAM_B')
    returning id into v_team_b_id;

  -- 3. Insert participants
  insert into match_participants (match_id, team_id, player_id)
    select v_match_id, v_team_a_id, unnest(p_team_a_player_ids);

  insert into match_participants (match_id, team_id, player_id)
    select v_match_id, v_team_b_id, unnest(p_team_b_player_ids);

  -- 4. Insert scores if provided (skip sets where both scores are 0)
  if p_scores is not null then
    for v_score in select * from jsonb_array_elements(p_scores) loop
      if (v_score->>'team_a_score')::int > 0 or (v_score->>'team_b_score')::int > 0 then
        insert into match_scores (match_id, set_number, team_a_score, team_b_score)
          values (
            v_match_id,
            (v_score->>'set_number')::int,
            (v_score->>'team_a_score')::int,
            (v_score->>'team_b_score')::int
          );
      end if;
    end loop;
  end if;

  return query select * from matches where id = v_match_id;
end;
$$;

grant execute on function create_match(uuid, text, timestamptz, text, text, int, int, uuid[], uuid[], text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. create_league_schedule
-- Atomically inserts a batch of league fixtures (match + teams + participants).
-- The TypeScript caller handles dedup; this RPC just does the atomic insert.
-- Returns the count of matches created.
-- ---------------------------------------------------------------------------
create or replace function create_league_schedule(
  p_session_id  uuid,
  p_match_type  text,
  p_played_at   timestamptz,
  p_fixtures    jsonb  -- array of {teamAPlayerIds: uuid[], teamBPlayerIds: uuid[], round: int, queuePosition: int}
)
returns int
language plpgsql
security definer
set search_path = public
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
    -- Extract player ID arrays from the fixture JSONB
    select array_agg(elem::uuid)
      into v_team_a_ids
      from jsonb_array_elements_text(v_fixture->'teamAPlayerIds') as elem;

    select array_agg(elem::uuid)
      into v_team_b_ids
      from jsonb_array_elements_text(v_fixture->'teamBPlayerIds') as elem;

    -- Insert match
    insert into matches (
      session_id, match_type, played_at, status,
      queue_position, league_round, created_by
    ) values (
      p_session_id, p_match_type, p_played_at, 'SCHEDULED',
      (v_fixture->>'queuePosition')::int,
      (v_fixture->>'round')::int,
      auth.uid()
    )
    returning id into v_match_id;

    -- Insert teams
    insert into match_teams (match_id, team_label, is_winner)
      values (v_match_id, 'TEAM_A', false)
      returning id into v_team_a_id;

    insert into match_teams (match_id, team_label, is_winner)
      values (v_match_id, 'TEAM_B', false)
      returning id into v_team_b_id;

    -- Insert participants
    insert into match_participants (match_id, team_id, player_id)
      select v_match_id, v_team_a_id, unnest(v_team_a_ids);

    insert into match_participants (match_id, team_id, player_id)
      select v_match_id, v_team_b_id, unnest(v_team_b_ids);

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function create_league_schedule(uuid, text, timestamptz, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. start_match
-- Transitions a match from SCHEDULED to LIVE.
-- ---------------------------------------------------------------------------
create or replace function start_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update matches
    set status = 'LIVE', queue_position = null, played_at = now()
    where id = p_match_id;
end;
$$;

grant execute on function start_match(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. reopen_match
-- Transitions a match from COMPLETED back to LIVE, then refreshes stats.
-- ---------------------------------------------------------------------------
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
  perform refresh_player_all_time_stats();
end;
$$;

grant execute on function reopen_match(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. delete_match
-- Admin-only: cascades deletes all child rows then refreshes stats.
-- ---------------------------------------------------------------------------
create or replace function delete_match(p_match_id uuid)
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

  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin required';
  end if;

  select session_id into v_session_id from matches where id = p_match_id;

  delete from match_scores       where match_id = p_match_id;
  delete from match_participants where match_id = p_match_id;
  delete from match_teams        where match_id = p_match_id;
  delete from player_match_results where match_id = p_match_id;
  delete from matches            where id = p_match_id;

  if v_session_id is not null then
    perform refresh_player_session_stats(v_session_id);
  end if;
  perform refresh_player_all_time_stats();
end;
$$;

grant execute on function delete_match(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. reorder_queue
-- Bulk-updates queue_position for a set of matches.
-- ---------------------------------------------------------------------------
create or replace function reorder_queue(p_updates jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_elem jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  for v_elem in select * from jsonb_array_elements(p_updates) loop
    update matches
      set queue_position = (v_elem->>'queue_position')::int
      where id = (v_elem->>'id')::uuid;
  end loop;
end;
$$;

grant execute on function reorder_queue(jsonb) to authenticated;
