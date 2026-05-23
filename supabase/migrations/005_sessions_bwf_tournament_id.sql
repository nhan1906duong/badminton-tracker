-- Replace category_slug with a proper FK to bwf_tournaments.
-- Also drop the one-open-session-per-user constraint so multiple
-- SCHEDULE / LIVE sessions can coexist.

-- 1. Drop the constraint that blocked multiple open sessions
DROP INDEX IF EXISTS one_open_session_per_user;

-- 2. Add FK column
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS bwf_tournament_id UUID REFERENCES bwf_tournaments(id) ON DELETE SET NULL;

-- 3. Prevent two sessions for the same tournament
CREATE UNIQUE INDEX IF NOT EXISTS one_session_per_tournament
  ON sessions(bwf_tournament_id)
  WHERE bwf_tournament_id IS NOT NULL;

-- 4. Index for FK lookups
CREATE INDEX IF NOT EXISTS idx_sessions_bwf_tournament ON sessions(bwf_tournament_id);

-- 5. Remove the old text column (no data to migrate — category_slug was never the PK)
ALTER TABLE sessions DROP COLUMN IF EXISTS category_slug;
