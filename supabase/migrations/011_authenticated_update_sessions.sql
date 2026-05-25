-- Allow any authenticated user to start/end sessions.
-- Delete access remains controlled by the separate admin-only delete policy.

DROP POLICY IF EXISTS "admins_update_sessions" ON sessions;
DROP POLICY IF EXISTS "sessions_update_own" ON sessions;
DROP POLICY IF EXISTS "sessions_update_any_auth" ON sessions;

CREATE POLICY "sessions_update_any_auth"
  ON sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
