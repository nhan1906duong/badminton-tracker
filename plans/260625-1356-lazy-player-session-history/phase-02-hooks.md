# Phase 2 — Hooks

## `usePlayerSessionStats(playerId)`

- `useQuery` against `get_player_session_stats` RPC
- Returns `PlayerSessionStat[]` — `{ session, matchCount, wins, losses }`
- `staleTime: 5min`, `enabled: !!playerId`
- No pagination — sessions are bounded per player

## `usePlayerMatchesBySession(playerId, sessionId)`

- `useQuery` against `matches` table (same dual-alias select as `usePlayerMatches`)
- Adds `.eq('session_id', sessionId)` filter
- No pagination — a single session is bounded
- `enabled: !!playerId && !!sessionId`
- `staleTime: 5min`

## Cleanup

- `usePlayerMatchHistory.ts` → deleted (logic moved to RPC + per-session hook)
- `usePlayerMatches.ts` → kept (still used by `useOpponents`, `useBestPartner`, `usePlayerBadges`)
