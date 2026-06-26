-- Phase 2 scalability indexes
-- Adds composite, partial, and FK-side indexes to support cursor-paginated and
-- player-scoped queries. All indexes use IF NOT EXISTS to be idempotent.
-- Existing single-column indexes (idx_matches_played_at, idx_matches_status,
-- idx_matches_session_id, idx_match_teams_match_id, idx_match_participants_match_id,
-- idx_match_participants_player_id, idx_match_scores_match_id, idx_pmr_player_id,
-- idx_pmr_match_id, idx_pmr_session_id) are NOT duplicated here.

-- Composite: session + status — used by session-scoped match queries
create index if not exists idx_matches_session_status
  on matches(session_id, status);

-- Partial composite: completed matches per session ordered for cursor pagination
create index if not exists idx_matches_completed_session_played_id
  on matches(session_id, played_at desc, id desc)
  where status = 'COMPLETED';

-- FK-side: team_id on participants (currently missing, needed for join performance)
create index if not exists idx_match_participants_team_id
  on match_participants(team_id);

-- Composite: player + match lookup on participants
create index if not exists idx_match_participants_player_match
  on match_participants(player_id, match_id);

-- Composite: player result history cursor (player_id + created_at for pagination)
create index if not exists idx_pmr_player_created_match
  on player_match_results(player_id, created_at desc, match_id);

-- Composite: session + player on results (used by session leaderboard aggregation)
create index if not exists idx_pmr_session_player
  on player_match_results(session_id, player_id);

-- Composite: ordered player name + id (for cursor-paginated player list/search)
create index if not exists idx_players_name_id
  on players(name, id);
