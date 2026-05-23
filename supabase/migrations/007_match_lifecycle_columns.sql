-- Match lifecycle fields used by scheduling, live matches, queues, and completion.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS queue_position INTEGER,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

UPDATE matches
SET status = 'COMPLETED'
WHERE status IS NULL;

ALTER TABLE matches
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'valid_match_status'
      AND conrelid = 'matches'::regclass
  ) THEN
    ALTER TABLE matches
      ADD CONSTRAINT valid_match_status
      CHECK (status IN ('SCHEDULED', 'LIVE', 'COMPLETED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_queue_position ON matches(session_id, queue_position)
  WHERE queue_position IS NOT NULL;
