# Plan: player_session_stats Materialized Table

**Status:** Done  
**Branch:** enhance/scalability

## Goal

Replace the on-demand aggregate RPC (`get_player_session_stats`) with a materialized
`player_session_stats` table. Stats are pre-computed via `refresh_player_session_stats`
RPC called on every match state change. Reads become O(1).

## Architecture

```
Match mutation (complete / reopen / end-no-winner)
  → call refresh_player_session_stats(session_id)
      → recount all players in session from source truth
      → RANK() by total_points DESC → avg_points DESC
      → UPSERT into player_session_stats

usePlayerSessionStats (read)
  → SELECT from player_session_stats JOIN sessions
  → sort client-side by started_at DESC
```

## Table Schema

```sql
player_session_stats (
  session_id    uuid  PK (FK → sessions, CASCADE)
  player_id     uuid  PK (FK → players, CASCADE)
  total_matches int
  total_wins    int
  session_rank  int   -- RANK() within session by weekly points
  updated_at    timestamptz
)
```

- RLS enabled, `GRANT SELECT TO anon, authenticated`
- Write-only via `refresh_player_session_stats` (SECURITY DEFINER)

## RPC: refresh_player_session_stats(p_session_id)

- Takes only `session_id` — always recounts ALL players in session
- Sources: `matches` + `match_participants` + `match_teams` for match counts; `player_match_results` for weekly points
- `RANK()` mirrors session leaderboard sort in `useRankings.ts`
- `SECURITY DEFINER` + `SET search_path = public` to bypass RLS on write

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | Migration: table + RPC | ✅ Done |
| 2 | Hook updates | ✅ Done |

## Files Changed

### New
- `supabase/migrations/20260625000001_player_session_stats_table.sql`

### Modified
- `src/hooks/usePlayerSessionStats.ts` — reads from table, exposes `sessionRank`
- `src/hooks/useMatches.ts` — calls refresh RPC in useRecordResult, useEndMatchNoWinner, useReopenMatch

### Removed
- `supabase/migrations/20260625000000_player_session_stats_rpc.sql` — old aggregate RPC, unused

## Key Decisions

- RPC drops `p_player_ids` param — rank needs all session players anyway, so always refresh all
- `losses` computed client-side (`total_matches - total_wins`) — no need to store
- `refreshSessionStatsForMatch` helper only fetches `session_id` now (simpler than fetching player_ids)
- Column name on `match_participants` is `team_id` not `match_team_id`
