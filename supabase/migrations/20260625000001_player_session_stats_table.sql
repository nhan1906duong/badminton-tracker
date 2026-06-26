-- Materialized per-player-per-session stats.
-- Written by refresh_player_session_stats RPC on every match state change.
-- Reads are O(1) — no aggregation at query time.

CREATE TABLE player_session_stats (
  session_id    uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id     uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  total_matches int  NOT NULL DEFAULT 0,
  total_wins    int  NOT NULL DEFAULT 0,
  session_rank  int  NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, player_id)
);

-- Index for the read path: fetch all sessions for one player
CREATE INDEX player_session_stats_player_idx ON player_session_stats (player_id);

-- RLS: enable security, allow public reads (aggregate stats — not sensitive)
ALTER TABLE player_session_stats ENABLE ROW LEVEL SECURITY;

-- Grant SELECT to both roles so PostgREST can reach the table
GRANT SELECT ON player_session_stats TO anon, authenticated;

CREATE POLICY "player_session_stats_select"
  ON player_session_stats FOR SELECT
  USING (true);

-- Recounts stats and rank for ALL players in the given session from source of truth.
-- Idempotent — safe to call multiple times; always reflects current DB state.
-- Only counts COMPLETED matches that have a declared winner.
-- Rank mirrors the session leaderboard sort: total_points DESC → avg_points DESC.
-- SECURITY DEFINER so the RPC can write to this table regardless of the caller's role.
CREATE OR REPLACE FUNCTION refresh_player_session_stats(p_session_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH session_stats AS (
    -- total_matches + total_wins per player (only matches with a declared winner)
    SELECT
      mp.player_id,
      COUNT(DISTINCT m.id)::int                                        AS total_matches,
      COUNT(DISTINCT CASE WHEN mt.is_winner = true THEN m.id END)::int AS total_wins
    FROM matches m
    JOIN match_participants mp ON mp.match_id = m.id
    JOIN match_teams mt        ON mt.id = mp.team_id
    WHERE m.session_id = p_session_id
      AND m.status = 'COMPLETED'
      AND EXISTS (
        SELECT 1 FROM match_teams wt
        WHERE wt.match_id = m.id AND wt.is_winner = true
      )
    GROUP BY mp.player_id
  ),
  session_points AS (
    -- weekly points per player from player_match_results
    SELECT player_id, COALESCE(SUM(total_weekly_points), 0) AS total_points
    FROM player_match_results
    WHERE session_id = p_session_id
    GROUP BY player_id
  ),
  combined AS (
    SELECT
      ss.player_id,
      ss.total_matches,
      ss.total_wins,
      COALESCE(sp.total_points, 0) AS total_points
    FROM session_stats ss
    LEFT JOIN session_points sp ON sp.player_id = ss.player_id
  ),
  ranked AS (
    SELECT
      player_id,
      total_matches,
      total_wins,
      RANK() OVER (
        ORDER BY
          total_points DESC,
          CASE WHEN total_matches > 0
            THEN total_points::float / total_matches
            ELSE 0
          END DESC
      )::int AS session_rank
    FROM combined
  )
  INSERT INTO player_session_stats (session_id, player_id, total_matches, total_wins, session_rank, updated_at)
  SELECT p_session_id, player_id, total_matches, total_wins, session_rank, now()
  FROM ranked
  ON CONFLICT (session_id, player_id) DO UPDATE
    SET total_matches = EXCLUDED.total_matches,
        total_wins    = EXCLUDED.total_wins,
        session_rank  = EXCLUDED.session_rank,
        updated_at    = now();
$$;
