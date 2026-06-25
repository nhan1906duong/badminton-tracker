-- Phase 5: League team mutation RPCs
-- create_league_team, update_league_team, delete_league_team
-- Replaces multi-step client-side mutations with atomic server-side operations.

-- ---------------------------------------------------------------------------
-- 1. create_league_team
-- Inserts a league team + its player links in a single transaction.
-- Returns the created league_teams row.
-- ---------------------------------------------------------------------------
create or replace function create_league_team(
  p_session_id uuid,
  p_name       text,
  p_player_ids uuid[]
)
returns setof league_teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into league_teams (session_id, name)
  values (p_session_id, p_name)
  returning id into v_team_id;

  if array_length(p_player_ids, 1) > 0 then
    insert into league_team_players (league_team_id, player_id)
    select v_team_id, unnest(p_player_ids);
  end if;

  return query select * from league_teams where id = v_team_id;
end;
$$;

grant execute on function create_league_team(uuid, text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. update_league_team
-- Atomically:
--   - Renames the team (if p_name is not null)
--   - Replaces the player roster (if p_player_ids is not null)
--   - Syncs scheduled match participants for team sides whose roster matched
--     the previous roster exactly
-- ---------------------------------------------------------------------------
create or replace function update_league_team(
  p_team_id    uuid,
  p_session_id uuid,
  p_name       text    default null,
  p_player_ids uuid[]  default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev_ids uuid[];
  v_match    record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Update name when provided
  if p_name is not null then
    update league_teams set name = p_name where id = p_team_id;
  end if;

  -- Replace roster + sync scheduled match participants when provided
  if p_player_ids is not null then
    -- Capture previous roster before deletion
    select array_agg(player_id)
    into v_prev_ids
    from league_team_players
    where league_team_id = p_team_id;

    -- Replace team player links
    delete from league_team_players where league_team_id = p_team_id;

    if array_length(p_player_ids, 1) > 0 then
      insert into league_team_players (league_team_id, player_id)
      select p_team_id, unnest(p_player_ids);
    end if;

    -- Sync scheduled match participants: find match_teams whose current
    -- participants exactly matched the previous roster, then replace them.
    for v_match in
      select m.id as match_id, mt.id as team_id
      from matches m
      join match_teams mt on mt.match_id = m.id
      where m.session_id = p_session_id
        and m.status = 'SCHEDULED'
        and (
          -- sorted current participants must equal sorted previous roster
          select array_agg(mp.player_id order by mp.player_id)
          from match_participants mp
          where mp.team_id = mt.id
        ) is not distinct from (
          select array_agg(pid order by pid)
          from unnest(v_prev_ids) as pid
        )
    loop
      delete from match_participants where team_id = v_match.team_id;

      if array_length(p_player_ids, 1) > 0 then
        insert into match_participants (match_id, team_id, player_id)
        select v_match.match_id, v_match.team_id, unnest(p_player_ids);
      end if;
    end loop;
  end if;
end;
$$;

grant execute on function update_league_team(uuid, uuid, text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. delete_league_team
-- Deletes a league team (admin only).
-- league_team_players rows are cleaned up via ON DELETE CASCADE on the FK.
-- ---------------------------------------------------------------------------
create or replace function delete_league_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_role from profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'Admin role required';
  end if;

  delete from league_teams where id = p_team_id;
end;
$$;

grant execute on function delete_league_team(uuid) to authenticated;
