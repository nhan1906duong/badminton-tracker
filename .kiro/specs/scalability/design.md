# Scalability Design

## Overview

This design removes global data fetches from user-facing screens and pushes aggregation
into Postgres. It follows the phased approach in `docs/scalability-plan.md` and maps
directly onto the 12 requirements.

No new tables are introduced in this design. Read models (Phase 4) are deferred until
RPCs are measured and proven insufficient.

## Architecture

The app runs React + TanStack Query on the frontend against a Supabase (Postgres + PostgREST) backend. The scalability work has two pillars:

1. **Frontend**: Replace global-scan hooks with player-scoped or paginated hooks. Every user-facing screen must only request data it actually needs.
2. **Backend**: Add composite/partial indexes to support the new query shapes, and add Postgres RPCs to push aggregation server-side (leaderboard, ranking summary, badge leaders, ranked match count).

Data flow after changes:

```
PlayerDetailPage
  → usePlayerMatches(playerId)         [cursor-paginated, scoped]
  → usePlayerMatchHistory(playerId)    [consumes usePlayerMatches, no global scan]
  → usePlayerPointsHistory(playerId)   [queries player_match_results by player_id]
  → usePlayerRankingSummary(playerId)  [RPC: get_player_ranking_summary]
  → useOpponents(playerId)             [consumes usePlayerMatches cache]
  → useBestPartner(playerId)           [consumes usePlayerMatches cache]
  → usePlayerBadges(playerId)          [scoped + get_badge_leaders RPC]

RankingPage
  → useLeaderboard()                   [RPC: get_leaderboard_page, paginated]

SessionsListPage / CalendarTab
  → useSessionLeaderboard(sessionId)   [per-visible-session, already scoped]
  (replaces useSessionLeaderboards() global scan)
```

## Components and Interfaces

### New Hooks

**`usePlayerRankingSummary(playerId: string)`** — `src/hooks/usePlayerRankingSummary.ts`
- Calls `get_player_ranking_summary(p_player_id)` RPC
- Returns `PlayerRankingStats | null`
- Query key: `['player-ranking-summary', playerId]`
- `staleTime: 60_000`

**`useLeaderboard(pageSize?: number)`** — `src/hooks/useLeaderboard.ts`
- Calls `get_leaderboard_page(p_limit, p_offset)` RPC via `useInfiniteQuery`
- Query key: `['leaderboard']`
- `staleTime: 60_000`
- Maps RPC snake_case response to `PlayerRankingStats` camelCase

### Modified Hooks

**`usePlayerMatches(playerId)`** — cursor pagination replacing OFFSET
- `PlayerMatchCursor { played_at: string; id: string }` exported interface
- Dual-alias select: `player_filter:match_participants!inner(player_id)` for filtering, `participants:match_participants(*, player:players(*))` for full data
- Embeds `session:sessions(*)` on every match row
- `PAGE_SIZE = 20`

**`usePlayerMatchHistory(playerId)`** — consumes `usePlayerMatches`
- Exposes `{ history, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage }`

**`usePlayerPointsHistory(playerId)`** — queries `player_match_results` directly
- Returns raw result rows with nested match+session data
- `useMemo` builds `SessionPointsHistory[]` from scoped rows

**`useOpponents(playerId)`** / **`useBestPartner(playerId)`** — consume `usePlayerMatches` cache

**`usePlayerBadges(playerId)`** — split into two tiers:
- Tier 1 (player-local): streak + matches played from `usePlayerMatches` pages
- Tier 2 (global leaders): `most_played` + `most_donated` from `get_badge_leaders()` RPC

**`useCompletedMatchCount()`** — calls `count_ranked_matches()` RPC

### New Postgres RPCs

**`count_ranked_matches()`** → `bigint`
- Counts distinct `match_id` from `player_match_results`

**`get_player_ranking_summary(p_player_id uuid)`** → `json`
- Returns one player's rank, rating, stats aggregated from ended sessions
- Rank = `count of players with higher rating + 1`

**`get_leaderboard_page(p_limit int, p_offset int)`** → table
- Full leaderboard with tie-breaker: rating → avg weekly pts → win rate → point diff
- `last_session_delta`, `rank_change`, `top_one_week_streak` stubbed as 0 (Phase 4)

**`get_badge_leaders()`** → table of `(badge_type, leader_id, leader_count)`
- Covers `most_played` and `most_donated`
- Streak/dynasty deferred to Phase 4

## Data Models

No new tables. The following existing tables are targeted by the new indexes and RPCs:

| Table | Role |
|-------|------|
| `matches` | Core match rows; new indexes on `(session_id, status)` and partial on `COMPLETED` |
| `match_participants` | New FK-side index on `team_id`; composite on `(player_id, match_id)` |
| `match_teams` | Unchanged |
| `match_scores` | Unchanged |
| `player_match_results` | New composite indexes on `(player_id, created_at desc, match_id)` and `(session_id, player_id)` |
| `players` | New composite index on `(name, id)` for cursor-paginated player lists |
| `sessions` | Unchanged |

### New Index Migration

```sql
-- supabase/migrations/20260623000000_scalability_indexes.sql
create index if not exists idx_matches_session_status
  on matches(session_id, status);
create index if not exists idx_matches_completed_session_played_id
  on matches(session_id, played_at desc, id desc)
  where status = 'COMPLETED';
create index if not exists idx_match_participants_team_id
  on match_participants(team_id);
create index if not exists idx_match_participants_player_match
  on match_participants(player_id, match_id);
create index if not exists idx_pmr_player_created_match
  on player_match_results(player_id, created_at desc, match_id);
create index if not exists idx_pmr_session_player
  on player_match_results(session_id, player_id);
create index if not exists idx_players_name_id
  on players(name, id);
```

### Semantic Decision

"Ranked matches" semantics preserved: count = distinct `match_id` from `player_match_results` (not `matches.status = 'COMPLETED'`). UI label stays "matches played".

## Error Handling

- All new hooks propagate Supabase errors through TanStack Query's `error` state. No silent swallowing.
- If `get_player_ranking_summary` returns null (player not found), `PlayerDetailPage` gracefully falls back to showing rating from `usePlayer` with no rank badge.
- If `get_badge_leaders` RPC fails, Tier 2 badges are omitted rather than blocking the page.
- Cursor pagination: if a cursor row has been deleted between pages, the keyset `OR` condition skips gracefully to the next available row — no crash, possibly a gap in results.

## Correctness Properties

- **Participant completeness**: The dual-alias select (`player_filter` + `participants`) ensures PostgREST's inner-join filter on `player_filter` does not strip other participants from the `participants` alias. All match participants are always returned.
- **Session grouping**: After rewrite, `usePlayerMatchHistory` groups by `match.session_id` using the embedded session object. If a session is not yet ended, it still appears in history (matches are `COMPLETED` even in active sessions).
- **Win/loss counting**: Only counts matches where `teams.some(t => t.is_winner)` — draws (no winner) are excluded, matching current behavior.
- **Tie-breaker parity**: `get_leaderboard_page` ORDER BY clause exactly mirrors the React sort in `usePlayerRankings()`: rating desc → avg_weekly_points desc → win_rate desc → point_difference desc.
- **Ranked match count semantics**: `count_ranked_matches()` counts `distinct match_id` from `player_match_results`, not `matches.status = 'COMPLETED'`. Same value as before.

## Testing Strategy

- TypeScript compile (`tsc --noEmit`) is the primary verification gate — run after each hook change.
- Existing hook unit tests in `src/hooks/__tests__/` must continue to pass.
- Manual smoke test checklist per task:
  - `PlayerDetailPage`: rank/rating display, history session grouping, W/L counts, load-more trigger
  - `RankingPage`: correct row order, tie-breaker matches old behavior
  - `PlayerDetailPage` sheets: opponents list, partners list, badges display
- SQL migration files: validate locally with `supabase db reset` or review against the list of existing indexes in `docs/scalability-plan.md` before applying.

## Out Of Scope (Deferred)

- Phase 4 read models (`player_stats`, `player_session_stats`, `leaderboard_cache`, `player_relationship_stats`) — add only after measuring RPC performance.
- Phase 6 realtime subscription scoping.
- `useH2HPairs()` and `useMenDoublesRankings()` global scans.
- `rankChange` and `topOneWeekStreak` on the leaderboard RPC — stubbed as 0.
- RLS policy cleanup (`auth.uid()` wrapping).
