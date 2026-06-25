-- Extend player_session_stats with aggregated points/score/rating columns so
-- useSessionLeaderboard can read one row per player instead of all match rows.

ALTER TABLE player_session_stats
  ADD COLUMN IF NOT EXISTS total_weekly_points int     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_for          int     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_against      int     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_rating_delta  numeric NOT NULL DEFAULT 0;

-- Replace the function to also persist the new columns.
CREATE OR REPLACE FUNCTION refresh_player_session_stats(p_session_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH session_stats AS (
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
    SELECT
      player_id,
      COALESCE(SUM(total_weekly_points), 0)::int AS total_weekly_points,
      COALESCE(SUM(team_score),          0)::int AS points_for,
      COALESCE(SUM(opponent_score),      0)::int AS points_against,
      COALESCE(SUM(rating_delta),        0)      AS total_rating_delta
    FROM player_match_results
    WHERE session_id = p_session_id
    GROUP BY player_id
  ),
  combined AS (
    SELECT
      ss.player_id,
      ss.total_matches,
      ss.total_wins,
      COALESCE(sp.total_weekly_points, 0) AS total_weekly_points,
      COALESCE(sp.points_for,          0) AS points_for,
      COALESCE(sp.points_against,      0) AS points_against,
      COALESCE(sp.total_rating_delta,  0) AS total_rating_delta
    FROM session_stats ss
    LEFT JOIN session_points sp ON sp.player_id = ss.player_id
  ),
  ranked AS (
    SELECT
      player_id,
      total_matches,
      total_wins,
      total_weekly_points,
      points_for,
      points_against,
      total_rating_delta,
      RANK() OVER (
        ORDER BY
          total_weekly_points DESC,
          CASE WHEN total_matches > 0 THEN total_weekly_points::float / total_matches ELSE 0 END DESC,
          total_wins DESC,
          (points_for - points_against) DESC
      )::int AS session_rank
    FROM combined
  )
  INSERT INTO player_session_stats (
    session_id, player_id,
    total_matches, total_wins,
    total_weekly_points, points_for, points_against, total_rating_delta,
    session_rank, updated_at
  )
  SELECT
    p_session_id, player_id,
    total_matches, total_wins,
    total_weekly_points, points_for, points_against, total_rating_delta,
    session_rank, now()
  FROM ranked
  ON CONFLICT (session_id, player_id) DO UPDATE
    SET total_matches        = EXCLUDED.total_matches,
        total_wins           = EXCLUDED.total_wins,
        total_weekly_points  = EXCLUDED.total_weekly_points,
        points_for           = EXCLUDED.points_for,
        points_against       = EXCLUDED.points_against,
        total_rating_delta   = EXCLUDED.total_rating_delta,
        session_rank         = EXCLUDED.session_rank,
        updated_at           = now();
$$;
