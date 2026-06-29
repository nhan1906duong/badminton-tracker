-- Phase 7: Add authorization checks to SECURITY DEFINER racket/quote CRUD RPCs.
-- These functions were SECURITY DEFINER but only checked auth.uid() is null,
-- letting any authenticated user mutate any player's rackets/quotes by bypassing RLS.
-- Also fixes SET search_path = '' on each function (defense-in-depth vs schema poisoning).

-- ---------------------------------------------------------------------------
-- create_player_racket
-- ---------------------------------------------------------------------------
create or replace function create_player_racket(
  p_player_id uuid,
  p_brand     text,
  p_real_name text,
  p_nickname  text    default null,
  p_mascot_id text    default null
)
returns setof public.player_rackets
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
    where id = (select auth.uid()) and player_id = p_player_id
  ) and not (select public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  return query
    insert into public.player_rackets (player_id, brand, real_name, nickname, mascot_id)
    values (p_player_id, p_brand, p_real_name, p_nickname, p_mascot_id)
    returning *;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_player_racket
-- ---------------------------------------------------------------------------
create or replace function update_player_racket(
  p_id        uuid,
  p_brand     text,
  p_real_name text,
  p_nickname  text    default null,
  p_mascot_id text    default null
)
returns setof public.player_rackets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select player_id into v_player_id from public.player_rackets where id = p_id;

  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and player_id = v_player_id
  ) and not (select public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  return query
    update public.player_rackets
    set brand     = p_brand,
        real_name = p_real_name,
        nickname  = p_nickname,
        mascot_id = p_mascot_id
    where id = p_id
    returning *;
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_player_racket
-- ---------------------------------------------------------------------------
create or replace function delete_player_racket(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select player_id into v_player_id from public.player_rackets where id = p_id;

  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and player_id = v_player_id
  ) and not (select public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  delete from public.player_rackets where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_player_quote
-- ---------------------------------------------------------------------------
create or replace function create_player_quote(
  p_player_id uuid,
  p_text      text
)
returns setof public.player_quotes
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
    where id = (select auth.uid()) and player_id = p_player_id
  ) and not (select public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  return query
    insert into public.player_quotes (player_id, text)
    values (p_player_id, p_text)
    returning *;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_player_quote
-- ---------------------------------------------------------------------------
create or replace function update_player_quote(
  p_id   uuid,
  p_text text
)
returns setof public.player_quotes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select player_id into v_player_id from public.player_quotes where id = p_id;

  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and player_id = v_player_id
  ) and not (select public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  return query
    update public.player_quotes
    set text = p_text
    where id = p_id
    returning *;
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_player_quote
-- ---------------------------------------------------------------------------
create or replace function delete_player_quote(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select player_id into v_player_id from public.player_quotes where id = p_id;

  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and player_id = v_player_id
  ) and not (select public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  delete from public.player_quotes where id = p_id;
end;
$$;
