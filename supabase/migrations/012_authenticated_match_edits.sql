-- Allow any authenticated user to start, record, reopen/update matches, and edit match details.
-- Delete access to the top-level matches table remains admin-only via 008_role.sql.

DROP POLICY IF EXISTS "matches_update_own" ON matches;
DROP POLICY IF EXISTS "matches_update_any_auth" ON matches;

CREATE POLICY "matches_update_any_auth"
  ON matches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "match_teams_insert_own" ON match_teams;
DROP POLICY IF EXISTS "match_teams_update_own" ON match_teams;
DROP POLICY IF EXISTS "match_teams_delete_own" ON match_teams;
DROP POLICY IF EXISTS "match_teams_insert_any_auth" ON match_teams;
DROP POLICY IF EXISTS "match_teams_update_any_auth" ON match_teams;
DROP POLICY IF EXISTS "match_teams_delete_any_auth" ON match_teams;

CREATE POLICY "match_teams_insert_any_auth"
  ON match_teams FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "match_teams_update_any_auth"
  ON match_teams FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "match_teams_delete_any_auth"
  ON match_teams FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "match_participants_insert_own" ON match_participants;
DROP POLICY IF EXISTS "match_participants_update_own" ON match_participants;
DROP POLICY IF EXISTS "match_participants_delete_own" ON match_participants;
DROP POLICY IF EXISTS "match_participants_insert_any_auth" ON match_participants;
DROP POLICY IF EXISTS "match_participants_update_any_auth" ON match_participants;
DROP POLICY IF EXISTS "match_participants_delete_any_auth" ON match_participants;

CREATE POLICY "match_participants_insert_any_auth"
  ON match_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "match_participants_update_any_auth"
  ON match_participants FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "match_participants_delete_any_auth"
  ON match_participants FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "match_scores_insert_own" ON match_scores;
DROP POLICY IF EXISTS "match_scores_update_own" ON match_scores;
DROP POLICY IF EXISTS "match_scores_delete_own" ON match_scores;
DROP POLICY IF EXISTS "match_scores_insert_any_auth" ON match_scores;
DROP POLICY IF EXISTS "match_scores_update_any_auth" ON match_scores;
DROP POLICY IF EXISTS "match_scores_delete_any_auth" ON match_scores;

CREATE POLICY "match_scores_insert_any_auth"
  ON match_scores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "match_scores_update_any_auth"
  ON match_scores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "match_scores_delete_any_auth"
  ON match_scores FOR DELETE
  TO authenticated
  USING (true);
