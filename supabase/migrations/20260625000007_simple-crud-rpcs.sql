-- Phase 1: Simple CRUD RPCs
-- Moves direct table mutations to server-side RPCs for players, sessions,
-- player_rackets, player_quotes, session_attendances, and profiles.

-- ---------------------------------------------------------------------------
-- 1a. create_player
-- ---------------------------------------------------------------------------
create or replace function create_player(
  p_name  text,
  p_email text default null
)
returns setof players
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
    insert into players (name, email, created_by)
    values (p_name, p_email, auth.uid())
    returning *;
end;
$$;

grant execute on function create_player(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 1b. update_player
-- ---------------------------------------------------------------------------
create or replace function update_player(
  p_id               uuid,
  p_name             text    default null,
  p_email            text    default null,
  p_avatar_url       text    default null,
  p_active_racket_id uuid    default null,
  p_clear_avatar     bool    default false
)
returns setof players
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
    update players
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

grant execute on function update_player(uuid, text, text, text, uuid, bool) to authenticated;

-- ---------------------------------------------------------------------------
-- 1c. delete_player (admin only)
-- ---------------------------------------------------------------------------
create or replace function delete_player(p_id uuid)
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

  delete from match_participants where player_id = p_id;
  delete from players where id = p_id;
end;
$$;

grant execute on function delete_player(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2a. create_session
-- ---------------------------------------------------------------------------
create or replace function create_session(
  p_type               text,
  p_label              text        default null,
  p_started_at         timestamptz default null,
  p_bwf_tournament_id  uuid        default null,
  p_league_match_type  text        default null,
  p_league_total_rounds int        default null
)
returns setof sessions
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- League validation
  if p_type = 'league' and (p_league_match_type is null or p_league_total_rounds is null) then
    raise exception 'League session requires match type and round count';
  end if;

  -- Duplicate tournament guard
  if p_bwf_tournament_id is not null and exists (
    select 1 from sessions where bwf_tournament_id = p_bwf_tournament_id
  ) then
    raise exception 'A session for this tournament already exists.';
  end if;

  return query
    insert into sessions (
      type,
      label,
      started_at,
      bwf_tournament_id,
      league_match_type,
      league_total_rounds,
      created_by
    )
    values (
      p_type::session_type,
      p_label,
      coalesce(p_started_at, now()),
      p_bwf_tournament_id,
      p_league_match_type::match_type,
      p_league_total_rounds,
      auth.uid()
    )
    returning *;
end;
$$;

grant execute on function create_session(text, text, timestamptz, uuid, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 2b. start_session
-- ---------------------------------------------------------------------------
create or replace function start_session(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update sessions set started_at = now() where id = p_id;
end;
$$;

grant execute on function start_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2c. update_session_start_time
-- ---------------------------------------------------------------------------
create or replace function update_session_start_time(
  p_id         uuid,
  p_started_at timestamptz
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

  update sessions set started_at = p_started_at where id = p_id;
end;
$$;

grant execute on function update_session_start_time(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 2d. rename_session
-- ---------------------------------------------------------------------------
create or replace function rename_session(p_id uuid, p_label text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update sessions set label = nullif(trim(p_label), '') where id = p_id;
end;
$$;

grant execute on function rename_session(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2e. update_league_total_rounds
-- ---------------------------------------------------------------------------
create or replace function update_league_total_rounds(p_id uuid, p_rounds int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update sessions set league_total_rounds = p_rounds where id = p_id;
end;
$$;

grant execute on function update_league_total_rounds(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 3a. create_player_racket
-- ---------------------------------------------------------------------------
create or replace function create_player_racket(
  p_player_id uuid,
  p_brand     text,
  p_real_name text,
  p_nickname  text    default null,
  p_mascot_id text    default null
)
returns setof player_rackets
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
    insert into player_rackets (player_id, brand, real_name, nickname, mascot_id)
    values (p_player_id, p_brand, p_real_name, p_nickname, p_mascot_id)
    returning *;
end;
$$;

grant execute on function create_player_racket(uuid, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3b. update_player_racket
-- ---------------------------------------------------------------------------
create or replace function update_player_racket(
  p_id        uuid,
  p_brand     text,
  p_real_name text,
  p_nickname  text    default null,
  p_mascot_id text    default null
)
returns setof player_rackets
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
    update player_rackets
    set brand     = p_brand,
        real_name = p_real_name,
        nickname  = p_nickname,
        mascot_id = p_mascot_id
    where id = p_id
    returning *;
end;
$$;

grant execute on function update_player_racket(uuid, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3c. delete_player_racket
-- ---------------------------------------------------------------------------
create or replace function delete_player_racket(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from player_rackets where id = p_id;
end;
$$;

grant execute on function delete_player_racket(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4a. create_player_quote
-- ---------------------------------------------------------------------------
create or replace function create_player_quote(
  p_player_id uuid,
  p_text      text
)
returns setof player_quotes
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
    insert into player_quotes (player_id, text)
    values (p_player_id, p_text)
    returning *;
end;
$$;

grant execute on function create_player_quote(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4b. update_player_quote
-- ---------------------------------------------------------------------------
create or replace function update_player_quote(
  p_id   uuid,
  p_text text
)
returns setof player_quotes
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
    update player_quotes
    set text = p_text
    where id = p_id
    returning *;
end;
$$;

grant execute on function update_player_quote(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4c. delete_player_quote
-- ---------------------------------------------------------------------------
create or replace function delete_player_quote(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from player_quotes where id = p_id;
end;
$$;

grant execute on function delete_player_quote(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5a. upsert_attendance
-- ---------------------------------------------------------------------------
create or replace function upsert_attendance(
  p_session_id uuid,
  p_player_id  uuid,
  p_status     text
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

  insert into session_attendances (session_id, player_id, status, updated_at)
  values (p_session_id, p_player_id, p_status::attendance_status, now())
  on conflict (session_id, player_id)
  do update set status = excluded.status, updated_at = now();
end;
$$;

grant execute on function upsert_attendance(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5b. delete_attendance
-- ---------------------------------------------------------------------------
create or replace function delete_attendance(
  p_session_id uuid,
  p_player_id  uuid
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

  delete from session_attendances
  where session_id = p_session_id and player_id = p_player_id;
end;
$$;

grant execute on function delete_attendance(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6a. update_player_link
-- ---------------------------------------------------------------------------
create or replace function update_player_link(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update profiles set player_id = p_player_id where id = auth.uid();
end;
$$;

grant execute on function update_player_link(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6b. clear_player_link
-- ---------------------------------------------------------------------------
create or replace function clear_player_link()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update profiles set player_id = null where id = auth.uid();
end;
$$;

grant execute on function clear_player_link() to authenticated;
