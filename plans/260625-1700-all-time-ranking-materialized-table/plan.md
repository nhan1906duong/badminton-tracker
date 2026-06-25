# Plan: player_all_time_stats Materialized Table

**Status:** Done  
**Branch:** enhance/scalability

## Goal

Replace the on-demand `get_leaderboard_page` + `get_player_ranking_summary` RPCs with a
materialized `player_all_time_stats` table. Same pattern as `player_session_stats`:
pre-computed via `refresh_player_all_time_stats()` on every match state change. Reads
become O(1) — a simple SELECT with no aggregation.

## Architecture

```
Match mutation (complete / reopen)
  → call refresh_player_all_time_stats()
      → recount all players from player_match_results (ended sessions only)
      → RANK() by rating DESC → avg_pts DESC → win_rate DESC → point_diff DESC
      → UPSERT into player_all_time_stats

useLeaderboard (read)
  → SELECT from player_all_time_stats JOIN players
  → no pagination needed — flat list, all players

usePlayerRankingSummary (read)
  → SELECT one row from player_all_time_stats JOIN players WHERE player_id = ?
```

## Table Schema

```sql
player_all_time_stats (
  player_id           uuid  PK (FK → players, CASCADE)
  all_time_rank       int   -- RANK() same tie-breaker as get_leaderboard_page
  matches_played      int
  wins                int
  losses              int
  win_rate            float
  total_weekly_points bigint
  avg_weekly_points   float
  points_for          bigint
  points_against      bigint
  point_difference    bigint
  total_rating_delta  float
  last_session_delta  float  -- stubbed 0 (Phase 4)
  rank_change         int    -- stubbed 0 (Phase 4)
  top_one_week_streak int    -- stubbed 0 (Phase 4)
  updated_at          timestamptz
)
```

- RLS enabled, `GRANT SELECT TO anon, authenticated`
- Write-only via `refresh_player_all_time_stats` (SECURITY DEFINER)

## RPC: refresh_player_all_time_stats()

- No parameters — always recounts ALL players (rank needs global context)
- Sources from `player_match_results` JOIN `sessions` (ended sessions only)
- Uses `players.rating` for rank sort (same as existing RPCs)
- Rank tie-breaker mirrors `get_leaderboard_page` exactly
- SECURITY DEFINER + SET search_path = public

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | Migration: table + RPC | ✅ Done |
| 2 | Backfill migration | ✅ Done |
| 3 | Hook updates | ✅ Done |

## Files to Change

### New
- `supabase/migrations/20260625000003_player_all_time_stats_table.sql`
- `supabase/migrations/20260625000004_backfill_player_all_time_stats.sql`

### Modified
- `src/hooks/useLeaderboard.ts` — read from table; drop `useInfiniteQuery` → `useQuery`
- `src/hooks/usePlayerRankingSummary.ts` — read from table instead of RPC
- `src/hooks/useMatches.ts` — call `refresh_player_all_time_stats()` in useRecordResult + useReopenMatch

### Unchanged
- `get_leaderboard_page` RPC — still present in DB (already applied, remove in future cleanup)
- `get_player_ranking_summary` RPC — same
- `get_badge_leaders` RPC — still needed for badges, unaffected

## Key Decisions

- No params on refresh RPC — RANK() is global, must recount all players
- Name/avatar not stored in table — JOIN players at query time (avoids stale denorm)
- `useLeaderboard` drops infinite scroll — player count is small, flat query is fine
- `useEndMatchNoWinner` also triggers refresh — safe/idempotent, covers reopen-from-winner edge case
- Phase 4 columns (last_session_delta, rank_change, top_one_week_streak) kept as 0 stubs
