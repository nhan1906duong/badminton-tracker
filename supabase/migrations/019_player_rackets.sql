-- Players can list the rackets they play with (brand, real name + nickname).
-- Limited to 4 per player, enforced at the app layer.

CREATE TABLE IF NOT EXISTS player_rackets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  real_name TEXT NOT NULL,
  nickname TEXT,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE player_rackets ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT 'Yonex';
ALTER TABLE player_rackets ALTER COLUMN brand DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_player_rackets_player ON player_rackets(player_id);

ALTER TABLE player_rackets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_rackets_select" ON player_rackets;
CREATE POLICY "player_rackets_select" ON player_rackets
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "player_rackets_insert" ON player_rackets;
CREATE POLICY "player_rackets_insert" ON player_rackets
  FOR INSERT TO authenticated WITH CHECK (
    player_id IN (SELECT player_id FROM profiles WHERE id = auth.uid() AND player_id IS NOT NULL)
    OR is_admin()
  );

DROP POLICY IF EXISTS "player_rackets_update" ON player_rackets;
CREATE POLICY "player_rackets_update" ON player_rackets
  FOR UPDATE TO authenticated USING (
    player_id IN (SELECT player_id FROM profiles WHERE id = auth.uid() AND player_id IS NOT NULL)
    OR is_admin()
  );

DROP POLICY IF EXISTS "player_rackets_delete" ON player_rackets;
CREATE POLICY "player_rackets_delete" ON player_rackets
  FOR DELETE TO authenticated USING (
    player_id IN (SELECT player_id FROM profiles WHERE id = auth.uid() AND player_id IS NOT NULL)
    OR is_admin()
  );
