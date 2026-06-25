-- Materialized all-time per-player ranking stats.
-- Written by refresh_player_all_time_stats RPC on every match state change.
-- Reads are O(1) — no aggregation at query time.
-- Replaces get_leaderboard_page and get_player_ranking_summary RPCs.

CREATE TABLE player_all_time_stats (
  player_id           uuid  NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  all_time_rank       int   NOT NULL DEFAULT 0,
  matches_played      int   NOT NULL DEFAULT 0,
  wins                int   NOT NULL DEFAULT 0,
  losses              int   NOT NULL DEFAULT 0,
  win_rate            float NOT NULL DEFAULT 0,
  total_weekly_points bigint NOT NULL DEFAULT 0,
  avg_weekly_points   float NOT NULL DEFAULT 0,
  points_for          bigint NOT NULL DEFAULT 0,
  points_against      bigint NOT NULL DEFAULT 0,
  point_difference    bigint NOT NULL DEFAULT 0,
  total_rating_delta  float NOT NULL DEFAULT 0,
  last_session_delta  float NOT NULL DEFAULT 0,  -- Phase 4
  rank_change         int   NOT NULL DEFAULT 0,  -- Phase 4
  top_one_week_streak int   NOT NULL DEFAULT 0,  -- Phase 4
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id)
);

-- RLS: allow public reads (aggregate stats — not sensitive)
ALTER TABLE player_all_time_stats ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON player_all_time_stats TO anon, authenticated;

CREATE POLICY "player_all_time_stats_select"
  ON player_all_time_stats FOR SELECT
  USING (true);

-- Recounts all-time stats and rank for ALL players from ended sessions.
-- Idempotent — safe to call multiple times; always reflects current DB state.
-- Rank mirrors get_leaderboard_page sort: rating → avg_pts → win_rate → point_diff.
-- SECURITY DEFINER so the RPC can write to this table regardless of caller role.
CREATE OR REPLACE FUNCTION refresh_player_all_time_stats()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ended_sessions AS (
    SELECT id FROM sessions WHERE ended_at IS NOT NULL
  ),
  player_stats AS (
    SELECT
      pmr.player_id,
      COUNT(DISTINCT pmr.match_id)::int                              AS matches_played,
      COUNT(*) FILTER (WHERE pmr.is_winner)::int                     AS wins,
      COUNT(*) FILTER (WHERE NOT pmr.is_winner)::int                 AS losses,
      SUM(pmr.total_weekly_points)                                   AS total_weekly_points,
      SUM(pmr.team_score)                                            AS points_for,
      SUM(pmr.opponent_score)                                        AS points_against,
      SUM(COALESCE(pmr.rating_delta, 0))                             AS total_rating_delta
    FROM player_match_results pmr
    WHERE pmr.session_id IN (SELECT id FROM ended_sessions)
    GROUP BY pmr.player_id
  ),
  all_players AS (
    SELECT
      p.id                                                               AS player_id,
      COALESCE(p.rating, 1000)                                           AS rating,
      COALESCE(ps.matches_played, 0)                                     AS matches_played,
      COALESCE(ps.wins, 0)                                               AS wins,
      COALESCE(ps.losses, 0)                                             AS losses,
      CASE WHEN COALESCE(ps.matches_played, 0) > 0
        THEN ps.wins::float / ps.matches_played ELSE 0 END               AS win_rate,
      COALESCE(ps.total_weekly_points, 0)                                AS total_weekly_points,
      CASE WHEN COALESCE(ps.matches_played, 0) > 0
        THEN ps.total_weekly_points::float / ps.matches_played ELSE 0 END AS avg_weekly_points,
      COALESCE(ps.points_for, 0)                                         AS points_for,
      COALESCE(ps.points_against, 0)                                     AS points_against,
      COALESCE(ps.points_for, 0) - COALESCE(ps.points_against, 0)       AS point_difference,
      COALESCE(ps.total_rating_delta, 0)                                 AS total_rating_delta
    FROM players p
    LEFT JOIN player_stats ps ON ps.player_id = p.id
  ),
  ranked AS (
    SELECT
      *,
      RANK() OVER (
        ORDER BY
          rating DESC,
          avg_weekly_points DESC,
          win_rate DESC,
          point_difference DESC
      )::int AS all_time_rank
    FROM all_players
  )
  INSERT INTO player_all_time_stats (
    player_id, all_time_rank, matches_played, wins, losses, win_rate,
    total_weekly_points, avg_weekly_points, points_for, points_against,
    point_difference, total_rating_delta, updated_at
  )
  SELECT
    player_id, all_time_rank, matches_played, wins, losses, win_rate,
    total_weekly_points, avg_weekly_points, points_for, points_against,
    point_difference, total_rating_delta, now()
  FROM ranked
  ON CONFLICT (player_id) DO UPDATE
    SET all_time_rank       = EXCLUDED.all_time_rank,
        matches_played      = EXCLUDED.matches_played,
        wins                = EXCLUDED.wins,
        losses              = EXCLUDED.losses,
        win_rate            = EXCLUDED.win_rate,
        total_weekly_points = EXCLUDED.total_weekly_points,
        avg_weekly_points   = EXCLUDED.avg_weekly_points,
        points_for          = EXCLUDED.points_for,
        points_against      = EXCLUDED.points_against,
        point_difference    = EXCLUDED.point_difference,
        total_rating_delta  = EXCLUDED.total_rating_delta,
        updated_at          = now();
  -- Note: last_session_delta, rank_change, top_one_week_streak NOT updated
  -- here — reserved for Phase 4 implementation.
$$;
