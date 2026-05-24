-- Add optional link from a user profile to their player record.
-- A user can claim exactly one player; a player can be claimed by at most one user.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id) ON DELETE SET NULL;

-- Partial unique index: only one non-null player_id per profile row
CREATE UNIQUE INDEX IF NOT EXISTS profiles_player_id_unique
  ON profiles (player_id) WHERE player_id IS NOT NULL;

-- Enable RLS on profiles if not already done
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all profiles (needed for admin checks, avatar display)
DROP POLICY IF EXISTS "profiles_select_all_auth" ON profiles;
CREATE POLICY "profiles_select_all_auth"
  ON profiles FOR SELECT TO authenticated USING (true);

-- Users can update their own profile row (e.g. to set player_id)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
