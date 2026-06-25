-- Backfill player_all_time_stats for all existing players.
-- Run this once after 20260625000003_player_all_time_stats_table.sql has been applied.
SELECT refresh_player_all_time_stats();
