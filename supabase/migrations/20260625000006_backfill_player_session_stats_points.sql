-- Backfill new points columns for all existing sessions.
DO $$
DECLARE
  sid uuid;
BEGIN
  FOR sid IN SELECT DISTINCT session_id FROM player_session_stats LOOP
    PERFORM refresh_player_session_stats(sid);
  END LOOP;
END;
$$;
