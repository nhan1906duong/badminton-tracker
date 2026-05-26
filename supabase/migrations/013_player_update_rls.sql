-- Restrict player updates to the linked user or admins.
-- Previously "players_update_any_auth" let every authenticated user update any player row.
DROP POLICY IF EXISTS "players_update_any_auth" ON players;

CREATE POLICY "players_update_linked_or_admin" ON players
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND player_id = players.id
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND player_id = players.id
    )
  );
