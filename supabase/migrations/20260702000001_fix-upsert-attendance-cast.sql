-- Fix: upsert_attendance cast to nonexistent type attendance_status.
-- session_attendances.status is TEXT CHECK ('confirmed','declined') — no enum type exists.
-- Remove the cast so the insert passes p_status as plain text.

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
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.session_attendances (session_id, player_id, status, updated_at)
  values (p_session_id, p_player_id, p_status, now())
  on conflict (session_id, player_id)
  do update set status = excluded.status, updated_at = now();
end;
$$;

grant execute on function upsert_attendance(uuid, uuid, text) to authenticated;
