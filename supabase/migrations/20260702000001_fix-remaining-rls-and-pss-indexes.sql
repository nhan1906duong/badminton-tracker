-- Phase 12: Fix remaining bare is_admin() / auth.uid() in missed tables,
-- add missing player_session_stats indexes, harden trigger search_paths.
--
-- Tables missed by phases 1–5:
--   players (013_player_update_rls.sql)     — bare is_admin() in UPDATE policy
--   session_attendances (017)               — bare is_admin() in INSERT/UPDATE/DELETE
--   league_teams (015_session_types.sql)    — bare auth.uid() in correlated EXISTS
--   league_team_players (015)               — same pattern
--
-- Trigger functions never touched by phase 8:
--   handle_new_user()         — SECURITY DEFINER, set search_path = public
--   restrict_bwf_session_label() — no fixed search_path, bare is_admin()

-- ============================================================
-- players — fix bare is_admin() in UPDATE policy
-- ============================================================
DROP POLICY IF EXISTS "players_update_linked_or_admin" ON players;
CREATE POLICY "players_update_linked_or_admin" ON players
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_admin())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND player_id = players.id
    )
  )
  WITH CHECK (
    (SELECT is_admin())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND player_id = players.id
    )
  );

-- ============================================================
-- session_attendances — fix bare is_admin() in write policies
-- ============================================================
DROP POLICY IF EXISTS "attendances_insert" ON session_attendances;
CREATE POLICY "attendances_insert" ON session_attendances
  FOR INSERT TO authenticated WITH CHECK (
    player_id IN (
      SELECT player_id FROM profiles
      WHERE id = (SELECT auth.uid()) AND player_id IS NOT NULL
    )
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "attendances_update" ON session_attendances;
CREATE POLICY "attendances_update" ON session_attendances
  FOR UPDATE TO authenticated USING (
    player_id IN (
      SELECT player_id FROM profiles
      WHERE id = (SELECT auth.uid()) AND player_id IS NOT NULL
    )
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "attendances_delete" ON session_attendances;
CREATE POLICY "attendances_delete" ON session_attendances
  FOR DELETE TO authenticated USING (
    player_id IN (
      SELECT player_id FROM profiles
      WHERE id = (SELECT auth.uid()) AND player_id IS NOT NULL
    )
    OR (SELECT is_admin())
  );

-- ============================================================
-- league_teams — fix bare auth.uid() in correlated EXISTS policies
-- ============================================================
DROP POLICY IF EXISTS "league_teams_insert_session_owner" ON league_teams;
CREATE POLICY "league_teams_insert_session_owner"
  ON league_teams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = league_teams.session_id
      AND sessions.created_by = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "league_teams_update_session_owner" ON league_teams;
CREATE POLICY "league_teams_update_session_owner"
  ON league_teams FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = league_teams.session_id
      AND sessions.created_by = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = league_teams.session_id
      AND sessions.created_by = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "league_teams_delete_session_owner" ON league_teams;
CREATE POLICY "league_teams_delete_session_owner"
  ON league_teams FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = league_teams.session_id
      AND sessions.created_by = (SELECT auth.uid())
  ));

-- ============================================================
-- league_team_players — fix bare auth.uid() in correlated EXISTS policies
-- ============================================================
DROP POLICY IF EXISTS "ltp_insert_team_owner" ON league_team_players;
CREATE POLICY "ltp_insert_team_owner"
  ON league_team_players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM league_teams
    JOIN sessions ON league_teams.session_id = sessions.id
    WHERE league_teams.id = league_team_players.league_team_id
      AND sessions.created_by = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "ltp_update_team_owner" ON league_team_players;
CREATE POLICY "ltp_update_team_owner"
  ON league_team_players FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM league_teams
    JOIN sessions ON league_teams.session_id = sessions.id
    WHERE league_teams.id = league_team_players.league_team_id
      AND sessions.created_by = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM league_teams
    JOIN sessions ON league_teams.session_id = sessions.id
    WHERE league_teams.id = league_team_players.league_team_id
      AND sessions.created_by = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "ltp_delete_team_owner" ON league_team_players;
CREATE POLICY "ltp_delete_team_owner"
  ON league_team_players FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM league_teams
    JOIN sessions ON league_teams.session_id = sessions.id
    WHERE league_teams.id = league_team_players.league_team_id
      AND sessions.created_by = (SELECT auth.uid())
  ));

-- ============================================================
-- player_session_stats — composite + partial indexes
--
-- idx_pss_player_rank: usePlayerAchievements runs
--   .eq('player_id', id).lte('session_rank', 2)
-- Existing idx covers player_id but then scans all session rows to apply
-- session_rank <= 2. Composite turns it into a range scan.
--
-- idx_pss_rank1_session_player: get_badge_leaders correlated NOT EXISTS +
-- usePlayerAchievements step-2 tie check both run:
--   WHERE session_id = $1 AND session_rank = 1 AND player_id != $2
-- PK (session_id, player_id) can't prune on session_rank = 1.
-- Partial index covers the filter directly.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pss_player_rank
  ON player_session_stats (player_id, session_rank);

CREATE INDEX IF NOT EXISTS idx_pss_rank1_session_player
  ON player_session_stats (session_id, player_id)
  WHERE session_rank = 1;

-- ============================================================
-- handle_new_user() — harden SECURITY DEFINER search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- restrict_bwf_session_label() — fix missing search_path + qualify is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION public.restrict_bwf_session_label()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.label IS DISTINCT FROM OLD.label THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only admins can rename sessions.';
    END IF;
    IF OLD.bwf_tournament_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot rename a session that is linked to a BWF tournament.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
