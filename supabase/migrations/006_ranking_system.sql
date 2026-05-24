-- Ranking / rating system

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 1000;

CREATE TABLE IF NOT EXISTS player_match_results (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           UUID        NOT NULL REFERENCES players(id)  ON DELETE CASCADE,
  match_id            UUID        NOT NULL REFERENCES matches(id)  ON DELETE CASCADE,
  session_id          UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  is_winner           BOOLEAN     NOT NULL,
  team_score          INTEGER     NOT NULL DEFAULT 0,
  opponent_score      INTEGER     NOT NULL DEFAULT 0,
  base_points         INTEGER     NOT NULL DEFAULT 0,
  attendance_points   INTEGER     NOT NULL DEFAULT 1,
  score_bonus         INTEGER     NOT NULL DEFAULT 0,
  strength_bonus      INTEGER     NOT NULL DEFAULT 0,
  total_weekly_points INTEGER     NOT NULL DEFAULT 1,
  rating_before       INTEGER,
  rating_after        INTEGER,
  rating_delta        INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_pmr_player_id  ON player_match_results(player_id);
CREATE INDEX IF NOT EXISTS idx_pmr_match_id   ON player_match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_pmr_session_id ON player_match_results(session_id);

ALTER TABLE player_match_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pmr_select" ON player_match_results;
DROP POLICY IF EXISTS "pmr_insert" ON player_match_results;
DROP POLICY IF EXISTS "pmr_update" ON player_match_results;
DROP POLICY IF EXISTS "pmr_delete" ON player_match_results;

CREATE POLICY "pmr_select" ON player_match_results
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "pmr_insert" ON player_match_results
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "pmr_update" ON player_match_results
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "pmr_delete" ON player_match_results
  FOR DELETE TO authenticated
  USING (true);
