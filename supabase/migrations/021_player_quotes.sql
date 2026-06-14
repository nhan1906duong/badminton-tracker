-- Players can add their own personal quotes, shown on their rackets page.
-- Limited to 5 per player, enforced at the app layer.

CREATE TABLE IF NOT EXISTS player_quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_player_quotes_player ON player_quotes(player_id);

ALTER TABLE player_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_quotes_select" ON player_quotes;
CREATE POLICY "player_quotes_select" ON player_quotes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "player_quotes_insert" ON player_quotes;
CREATE POLICY "player_quotes_insert" ON player_quotes
  FOR INSERT TO authenticated WITH CHECK (
    player_id IN (SELECT player_id FROM profiles WHERE id = auth.uid() AND player_id IS NOT NULL)
    OR is_admin()
  );

DROP POLICY IF EXISTS "player_quotes_update" ON player_quotes;
CREATE POLICY "player_quotes_update" ON player_quotes
  FOR UPDATE TO authenticated USING (
    player_id IN (SELECT player_id FROM profiles WHERE id = auth.uid() AND player_id IS NOT NULL)
    OR is_admin()
  );

DROP POLICY IF EXISTS "player_quotes_delete" ON player_quotes;
CREATE POLICY "player_quotes_delete" ON player_quotes
  FOR DELETE TO authenticated USING (
    player_id IN (SELECT player_id FROM profiles WHERE id = auth.uid() AND player_id IS NOT NULL)
    OR is_admin()
  );
