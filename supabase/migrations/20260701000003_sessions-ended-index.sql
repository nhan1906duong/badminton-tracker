-- Phase 10: Partial index on sessions for ended-session filter.
-- Every leaderboard, badge, and all-time stats RPC includes:
--   WHERE ended_at IS NOT NULL
-- or a CTE that selects session IDs where ended_at IS NOT NULL.
-- A partial index lets Postgres skip sessions rows with ended_at = NULL
-- (live/open sessions) and return only ended sessions via an index scan.

create index if not exists idx_sessions_ended_id
  on public.sessions (id)
  where ended_at is not null;
