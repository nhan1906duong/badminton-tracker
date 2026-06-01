CREATE TABLE session_attendances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'declined')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (session_id, player_id)
);

CREATE INDEX idx_session_attendances_session ON session_attendances(session_id);
CREATE INDEX idx_session_attendances_player ON session_attendances(player_id);

ALTER TABLE session_attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendances_select" ON session_attendances
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "attendances_insert" ON session_attendances
  FOR INSERT TO authenticated WITH CHECK (
    player_id IN (SELECT player_id FROM profiles WHERE id = auth.uid() AND player_id IS NOT NULL)
    OR is_admin()
  );

CREATE POLICY "attendances_update" ON session_attendances
  FOR UPDATE TO authenticated USING (
    player_id IN (SELECT player_id FROM profiles WHERE id = auth.uid() AND player_id IS NOT NULL)
    OR is_admin()
  );

CREATE POLICY "attendances_delete" ON session_attendances
  FOR DELETE TO authenticated USING (
    player_id IN (SELECT player_id FROM profiles WHERE id = auth.uid() AND player_id IS NOT NULL)
    OR is_admin()
  );
