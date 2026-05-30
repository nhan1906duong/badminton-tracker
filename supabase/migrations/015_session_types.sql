-- Migration 015: Session Types Expansion
-- Adds explicit session type (regular, tournament, league) and league support tables

-- 1. Add type column to sessions with default 'regular'
ALTER TABLE sessions ADD COLUMN type TEXT NOT NULL DEFAULT 'regular';

-- 2. Add league config columns
ALTER TABLE sessions ADD COLUMN league_match_type TEXT;
ALTER TABLE sessions ADD COLUMN league_total_rounds INT DEFAULT 2;

-- 3. Migrate existing sessions: tournament if linked to BWF, otherwise regular
UPDATE sessions SET type = 'tournament' WHERE bwf_tournament_id IS NOT NULL;

-- 4. Create league_teams table
CREATE TABLE league_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_league_teams_session ON league_teams(session_id);

-- 5. Create league_team_players junction table
CREATE TABLE league_team_players (
  league_team_id UUID REFERENCES league_teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (league_team_id, player_id)
);

CREATE INDEX idx_ltp_team ON league_team_players(league_team_id);
CREATE INDEX idx_ltp_player ON league_team_players(player_id);

-- 6. RLS policies for league_teams
ALTER TABLE league_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "league_teams_select_all_auth"
  ON league_teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "league_teams_insert_session_owner"
  ON league_teams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM sessions WHERE sessions.id = league_teams.session_id AND sessions.created_by = auth.uid()
  ));

CREATE POLICY "league_teams_delete_session_owner"
  ON league_teams FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions WHERE sessions.id = league_teams.session_id AND sessions.created_by = auth.uid()
  ));

CREATE POLICY "league_teams_update_session_owner"
  ON league_teams FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions WHERE sessions.id = league_teams.session_id AND sessions.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sessions WHERE sessions.id = league_teams.session_id AND sessions.created_by = auth.uid()
  ));

-- 7. RLS policies for league_team_players
ALTER TABLE league_team_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ltp_select_all_auth"
  ON league_team_players FOR SELECT TO authenticated USING (true);

CREATE POLICY "ltp_insert_team_owner"
  ON league_team_players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM league_teams
    JOIN sessions ON league_teams.session_id = sessions.id
    WHERE league_teams.id = league_team_players.league_team_id AND sessions.created_by = auth.uid()
  ));

CREATE POLICY "ltp_delete_team_owner"
  ON league_team_players FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM league_teams
    JOIN sessions ON league_teams.session_id = sessions.id
    WHERE league_teams.id = league_team_players.league_team_id AND sessions.created_by = auth.uid()
  ));

CREATE POLICY "ltp_update_team_owner"
  ON league_team_players FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM league_teams
    JOIN sessions ON league_teams.session_id = sessions.id
    WHERE league_teams.id = league_team_players.league_team_id AND sessions.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM league_teams
    JOIN sessions ON league_teams.session_id = sessions.id
    WHERE league_teams.id = league_team_players.league_team_id AND sessions.created_by = auth.uid()
  ));

-- 8. Check constraint: league sessions must have match type and round count
ALTER TABLE sessions ADD CONSTRAINT chk_league_fields
  CHECK (type != 'league' OR (league_match_type IS NOT NULL AND league_total_rounds IS NOT NULL));

-- 9. Update RLS on sessions to allow updates for session creators (needed for league config)
-- The existing policies should already cover this, but ensure the type column is included
