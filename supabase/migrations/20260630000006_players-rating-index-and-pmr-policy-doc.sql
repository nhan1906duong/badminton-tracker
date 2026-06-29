-- Phase 6: Index players.rating for rank subquery + document pmr write policies.

-- Functional index used by get_player_ranking_summary's rank subquery:
--   SELECT count(*) + 1 FROM players WHERE coalesce(rating, 1000) > coalesce($1, 1000)
-- players.rating is NOT NULL (added in 006_ranking_system.sql) so coalesce never fires,
-- but the query planner needs the functional form to match.
CREATE INDEX IF NOT EXISTS idx_players_rating_coalesced
  ON players (coalesce(rating, 1000) DESC);

-- pmr_insert / pmr_update intentionally use WITH CHECK (true).
-- All production writes to player_match_results go through SECURITY DEFINER RPCs
-- (record_result, end_match_no_winner, update_match_players, reopen_match,
-- end_session, recalculate_all_ratings) which enforce scoring logic and auth checks.
-- Direct PostgREST writes are technically possible for any authenticated user;
-- accepted risk for this app's trust model (small closed group, no untrusted users).
-- Tightening would require revoking INSERT/UPDATE from authenticated and routing
-- all writes exclusively through the RPCs — deferred until the user model changes.
COMMENT ON POLICY "pmr_insert" ON player_match_results
  IS 'Intentional open write: all production paths use SECURITY DEFINER RPCs. Direct PostgREST writes accepted for this closed-group trust model.';

COMMENT ON POLICY "pmr_update" ON player_match_results
  IS 'Intentional open write: all production paths use SECURITY DEFINER RPCs. Direct PostgREST writes accepted for this closed-group trust model.';
