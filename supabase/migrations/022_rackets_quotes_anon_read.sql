-- player_rackets and player_quotes were added after 018_public_read.sql and
-- only granted SELECT to `authenticated`, so logged-out users can't see a
-- player's racket section or mascot. Add matching anon SELECT policies.

CREATE POLICY "player_rackets_select_anon" ON player_rackets FOR SELECT TO anon USING (true);
CREATE POLICY "player_quotes_select_anon"  ON player_quotes  FOR SELECT TO anon USING (true);
