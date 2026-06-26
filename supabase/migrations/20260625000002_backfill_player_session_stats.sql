-- Backfill player_session_stats for all existing sessions one by one.
-- Run this once after 20260625000001_player_session_stats_table.sql has been applied.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM sessions ORDER BY started_at ASC LOOP
    PERFORM refresh_player_session_stats(r.id);
  END LOOP;
END;
$$;
