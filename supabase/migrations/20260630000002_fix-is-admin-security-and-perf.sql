-- Phase 2: Harden is_admin() SECURITY DEFINER function and cache its result
-- in DELETE policies.
--
-- Fix 1: SET search_path = '' prevents a malicious schema from shadowing
--         public.profiles and hijacking the admin check.
-- Fix 2: (select is_admin()) in DELETE policies caches the result once per
--         query instead of calling the function once per row scanned.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

-- Recreate DELETE policies so is_admin() is evaluated once per query, not per row.
DROP POLICY IF EXISTS "admins_delete_sessions" ON sessions;
DROP POLICY IF EXISTS "admins_delete_matches"  ON matches;
DROP POLICY IF EXISTS "admins_delete_players"  ON players;

CREATE POLICY "admins_delete_sessions" ON sessions
  FOR DELETE USING ((select is_admin()));

CREATE POLICY "admins_delete_matches" ON matches
  FOR DELETE USING ((select is_admin()));

CREATE POLICY "admins_delete_players" ON players
  FOR DELETE USING ((select is_admin()));
