-- Each racket can have its own mascot (key into the MASCOTS registry, like
-- players.mascot_id), and a player can mark one racket as their active one.
-- The active racket's mascot (if set) takes precedence over the player's
-- own mascot on their profile.

ALTER TABLE player_rackets ADD COLUMN IF NOT EXISTS mascot_id text;

ALTER TABLE players ADD COLUMN IF NOT EXISTS active_racket_id uuid REFERENCES player_rackets(id) ON DELETE SET NULL;
