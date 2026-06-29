-- Phase 5: Fix per-row auth.uid() / is_admin() on player_rackets, player_quotes, profiles.
-- Same anti-patterns fixed in phases 1–2 but missed on these three tables.
-- Wrapping in (select ...) caches the result once per query instead of per row scanned.

-- ---- PLAYER_RACKETS ----
DROP POLICY IF EXISTS "player_rackets_insert" ON player_rackets;
CREATE POLICY "player_rackets_insert" ON player_rackets
  FOR INSERT TO authenticated WITH CHECK (
    player_id IN (
      SELECT player_id FROM profiles
      WHERE id = (SELECT auth.uid()) AND player_id IS NOT NULL
    )
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "player_rackets_update" ON player_rackets;
CREATE POLICY "player_rackets_update" ON player_rackets
  FOR UPDATE TO authenticated USING (
    player_id IN (
      SELECT player_id FROM profiles
      WHERE id = (SELECT auth.uid()) AND player_id IS NOT NULL
    )
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "player_rackets_delete" ON player_rackets;
CREATE POLICY "player_rackets_delete" ON player_rackets
  FOR DELETE TO authenticated USING (
    player_id IN (
      SELECT player_id FROM profiles
      WHERE id = (SELECT auth.uid()) AND player_id IS NOT NULL
    )
    OR (SELECT is_admin())
  );

-- ---- PLAYER_QUOTES ----
DROP POLICY IF EXISTS "player_quotes_insert" ON player_quotes;
CREATE POLICY "player_quotes_insert" ON player_quotes
  FOR INSERT TO authenticated WITH CHECK (
    player_id IN (
      SELECT player_id FROM profiles
      WHERE id = (SELECT auth.uid()) AND player_id IS NOT NULL
    )
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "player_quotes_update" ON player_quotes;
CREATE POLICY "player_quotes_update" ON player_quotes
  FOR UPDATE TO authenticated USING (
    player_id IN (
      SELECT player_id FROM profiles
      WHERE id = (SELECT auth.uid()) AND player_id IS NOT NULL
    )
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "player_quotes_delete" ON player_quotes;
CREATE POLICY "player_quotes_delete" ON player_quotes
  FOR DELETE TO authenticated USING (
    player_id IN (
      SELECT player_id FROM profiles
      WHERE id = (SELECT auth.uid()) AND player_id IS NOT NULL
    )
    OR (SELECT is_admin())
  );

-- ---- PROFILES ----
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING    (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));
