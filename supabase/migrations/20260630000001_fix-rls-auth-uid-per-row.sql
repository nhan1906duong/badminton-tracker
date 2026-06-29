-- Phase 1: Fix auth.uid() per-row anti-pattern in RLS policies.
-- Wrapping auth.uid() in (select ...) causes Postgres to evaluate it once per
-- query and cache the result, instead of calling it once per row scanned.
-- Zero semantic change — same users pass/fail.

-- ---- SESSIONS ----
DROP POLICY IF EXISTS "sessions_insert_own" ON sessions;
DROP POLICY IF EXISTS "sessions_update_own" ON sessions;

CREATE POLICY "sessions_insert_own" ON sessions
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "sessions_update_own" ON sessions
  FOR UPDATE TO authenticated
  USING  ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

-- ---- MATCHES ----
DROP POLICY IF EXISTS "matches_insert_own" ON matches;
DROP POLICY IF EXISTS "matches_update_own" ON matches;
DROP POLICY IF EXISTS "matches_delete_own" ON matches;

CREATE POLICY "matches_insert_own" ON matches
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "matches_update_own" ON matches
  FOR UPDATE TO authenticated
  USING  ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "matches_delete_own" ON matches
  FOR DELETE TO authenticated
  USING  ((select auth.uid()) = created_by);

-- ---- MATCH_TEAMS ----
DROP POLICY IF EXISTS "match_teams_insert_own" ON match_teams;
DROP POLICY IF EXISTS "match_teams_update_own" ON match_teams;
DROP POLICY IF EXISTS "match_teams_delete_own" ON match_teams;

CREATE POLICY "match_teams_insert_own" ON match_teams
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_teams.match_id AND m.created_by = (select auth.uid())
  ));

CREATE POLICY "match_teams_update_own" ON match_teams
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_teams.match_id AND m.created_by = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_teams.match_id AND m.created_by = (select auth.uid())
  ));

CREATE POLICY "match_teams_delete_own" ON match_teams
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_teams.match_id AND m.created_by = (select auth.uid())
  ));

-- ---- MATCH_PARTICIPANTS ----
DROP POLICY IF EXISTS "match_participants_insert_own" ON match_participants;
DROP POLICY IF EXISTS "match_participants_update_own" ON match_participants;
DROP POLICY IF EXISTS "match_participants_delete_own" ON match_participants;

CREATE POLICY "match_participants_insert_own" ON match_participants
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_participants.match_id AND m.created_by = (select auth.uid())
  ));

CREATE POLICY "match_participants_update_own" ON match_participants
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_participants.match_id AND m.created_by = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_participants.match_id AND m.created_by = (select auth.uid())
  ));

CREATE POLICY "match_participants_delete_own" ON match_participants
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_participants.match_id AND m.created_by = (select auth.uid())
  ));

-- ---- MATCH_SCORES ----
DROP POLICY IF EXISTS "match_scores_insert_own" ON match_scores;
DROP POLICY IF EXISTS "match_scores_update_own" ON match_scores;
DROP POLICY IF EXISTS "match_scores_delete_own" ON match_scores;

CREATE POLICY "match_scores_insert_own" ON match_scores
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_scores.match_id AND m.created_by = (select auth.uid())
  ));

CREATE POLICY "match_scores_update_own" ON match_scores
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_scores.match_id AND m.created_by = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_scores.match_id AND m.created_by = (select auth.uid())
  ));

CREATE POLICY "match_scores_delete_own" ON match_scores
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_scores.match_id AND m.created_by = (select auth.uid())
  ));
