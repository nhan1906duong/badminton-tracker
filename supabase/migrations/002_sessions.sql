-- Badminton Match Tracker — Sessions Migration

-- ============================================
-- SESSIONS TABLE
-- ============================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- LINK MATCHES TO SESSIONS
-- ============================================

ALTER TABLE matches
ADD COLUMN session_id UUID REFERENCES sessions(id) ON DELETE CASCADE;

-- Wipe all legacy matches (cascade cleans up match_teams, match_participants, match_scores)
DELETE FROM matches;

-- Now enforce NOT NULL (all rows deleted, so safe)
ALTER TABLE matches
ALTER COLUMN session_id SET NOT NULL;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_sessions_created_by ON sessions(created_by);
CREATE INDEX idx_sessions_ended_at ON sessions(ended_at);
CREATE INDEX idx_matches_session_id ON matches(session_id);

-- Only one open session per user
CREATE UNIQUE INDEX one_open_session_per_user
  ON sessions(created_by)
  WHERE ended_at IS NULL;

-- ============================================
-- ROW LEVEL SECURITY — SESSIONS
-- ============================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_all_auth"
  ON sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sessions_insert_own"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "sessions_update_own"
  ON sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "sessions_delete_own"
  ON sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
