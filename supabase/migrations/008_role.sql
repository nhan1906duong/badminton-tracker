-- 1. Add role column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('admin', 'user'));

-- 2. Grant yourself admin
UPDATE profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'nhan.1906duong@gmail.com');

-- 3. Helper function for RLS policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 4. RLS: only admins can delete sessions, matches, players
--    Drop existing permissive delete policies first if any exist, then add these.
CREATE POLICY "admins_delete_sessions" ON sessions
  FOR DELETE USING (is_admin());

CREATE POLICY "admins_delete_matches" ON matches
  FOR DELETE USING (is_admin());

CREATE POLICY "admins_delete_players" ON players
  FOR DELETE USING (is_admin());
