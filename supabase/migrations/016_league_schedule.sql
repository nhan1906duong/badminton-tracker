-- Migration 016: League Schedule Pre-creation
-- Adds league_round column to matches for tracking round in league schedule

ALTER TABLE matches ADD COLUMN league_round INT;

CREATE INDEX idx_matches_league_round ON matches(session_id, league_round) WHERE league_round IS NOT NULL;
