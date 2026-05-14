-- Badminton Match Tracker — Initial Schema

-- ============================================
-- ENUMS (as check constraints on TEXT)
-- ============================================

-- match_type values: MEN_SINGLES, WOMEN_SINGLES, MEN_DOUBLES, WOMEN_DOUBLES, MIXED_DOUBLES

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_type TEXT NOT NULL DEFAULT 'MEN_DOUBLES',
  played_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_match_type CHECK (
    match_type IN ('MEN_SINGLES', 'WOMEN_SINGLES', 'MEN_DOUBLES', 'WOMEN_DOUBLES', 'MIXED_DOUBLES')
  )
);

CREATE TABLE match_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  team_label TEXT NOT NULL,
  is_winner BOOLEAN DEFAULT false,

  CONSTRAINT valid_team_label CHECK (team_label IN ('TEAM_A', 'TEAM_B')),
  UNIQUE(match_id, team_label)
);

CREATE TABLE match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES match_teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) NOT NULL,

  UNIQUE(match_id, player_id)
);

CREATE TABLE match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  set_number INT NOT NULL,
  team_a_score INT NOT NULL DEFAULT 0,
  team_b_score INT NOT NULL DEFAULT 0,

  UNIQUE(match_id, set_number)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_players_active ON players(is_active);
CREATE INDEX idx_matches_played_at ON matches(played_at DESC);
CREATE INDEX idx_match_teams_match_id ON match_teams(match_id);
CREATE INDEX idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX idx_match_participants_player_id ON match_participants(player_id);
CREATE INDEX idx_match_scores_match_id ON match_scores(match_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;

-- ---- PLAYERS ----

CREATE POLICY "players_select_all_auth"
  ON players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "players_insert_any_auth"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "players_update_any_auth"
  ON players FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "players_delete_any_auth"
  ON players FOR DELETE
  TO authenticated
  USING (true);

-- ---- MATCHES ----

CREATE POLICY "matches_select_all_auth"
  ON matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "matches_insert_own"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "matches_update_own"
  ON matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "matches_delete_own"
  ON matches FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ---- MATCH_TEAMS ----

CREATE POLICY "match_teams_select_all_auth"
  ON match_teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "match_teams_insert_own"
  ON match_teams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_teams.match_id
      AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "match_teams_update_own"
  ON match_teams FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_teams.match_id
      AND m.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_teams.match_id
      AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "match_teams_delete_own"
  ON match_teams FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_teams.match_id
      AND m.created_by = auth.uid()
    )
  );

-- ---- MATCH_PARTICIPANTS ----

CREATE POLICY "match_participants_select_all_auth"
  ON match_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "match_participants_insert_own"
  ON match_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_participants.match_id
      AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "match_participants_update_own"
  ON match_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_participants.match_id
      AND m.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_participants.match_id
      AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "match_participants_delete_own"
  ON match_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_participants.match_id
      AND m.created_by = auth.uid()
    )
  );

-- ---- MATCH_SCORES ----

CREATE POLICY "match_scores_select_all_auth"
  ON match_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "match_scores_insert_own"
  ON match_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_scores.match_id
      AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "match_scores_update_own"
  ON match_scores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_scores.match_id
      AND m.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_scores.match_id
      AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "match_scores_delete_own"
  ON match_scores FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_scores.match_id
      AND m.created_by = auth.uid()
    )
  );
