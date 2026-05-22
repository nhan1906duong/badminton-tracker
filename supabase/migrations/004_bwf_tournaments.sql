-- BWF tournament cache — populated by the bwf-sync Edge Function
-- Frontend reads from here; never fetches BWF directly (Cloudflare blocks it)

CREATE TABLE bwf_tournaments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  category_slug TEXT NOT NULL,
  category_name TEXT NOT NULL,
  venue        TEXT,
  synced_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bwf_tournaments_dates ON bwf_tournaments(start_date, end_date);
CREATE INDEX idx_bwf_tournaments_category ON bwf_tournaments(category_slug);

-- Anyone authenticated can read; only service role can write (the sync function)
ALTER TABLE bwf_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bwf_tournaments_read"
  ON bwf_tournaments FOR SELECT
  TO authenticated
  USING (true);
