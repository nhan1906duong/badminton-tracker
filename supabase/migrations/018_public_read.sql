-- Allow unauthenticated (anon) users to read all public data.
-- Write policies (INSERT / UPDATE / DELETE) remain TO authenticated.
-- Profiles stay TO authenticated — auth identity linkage is not public.

CREATE POLICY "players_select_anon"         ON players              FOR SELECT TO anon USING (true);
CREATE POLICY "sessions_select_anon"        ON sessions             FOR SELECT TO anon USING (true);
CREATE POLICY "matches_select_anon"         ON matches              FOR SELECT TO anon USING (true);
CREATE POLICY "match_teams_select_anon"     ON match_teams          FOR SELECT TO anon USING (true);
CREATE POLICY "match_participants_select_anon" ON match_participants FOR SELECT TO anon USING (true);
CREATE POLICY "match_scores_select_anon"    ON match_scores         FOR SELECT TO anon USING (true);
CREATE POLICY "pmr_select_anon"             ON player_match_results FOR SELECT TO anon USING (true);
CREATE POLICY "bwf_tournaments_read_anon"   ON bwf_tournaments      FOR SELECT TO anon USING (true);
CREATE POLICY "league_teams_select_anon"    ON league_teams         FOR SELECT TO anon USING (true);
CREATE POLICY "ltp_select_anon"             ON league_team_players  FOR SELECT TO anon USING (true);
CREATE POLICY "attendances_select_anon"     ON session_attendances  FOR SELECT TO anon USING (true);
