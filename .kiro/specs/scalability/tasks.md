# Implementation Plan

## Overview

Implement the scalability improvements described in `design.md`, removing global data fetches from user-facing screens and pushing aggregation into Postgres. Tasks are ordered to minimize risk: database layer first, then hook rewrites, then page updates, then cache hygiene.

## Tasks

- [x] 1. Add Phase 2 database indexes migration
  - Create `supabase/migrations/20260623000000_scalability_indexes.sql`
  - Add `idx_matches_session_status` on `matches(session_id, status)`
  - Add `idx_matches_completed_session_played_id` partial index on `matches(session_id, played_at desc, id desc) where status = 'COMPLETED'`
  - Add `idx_match_participants_team_id` on `match_participants(team_id)`
  - Add `idx_match_participants_player_match` on `match_participants(player_id, match_id)`
  - Add `idx_pmr_player_created_match` on `player_match_results(player_id, created_at desc, match_id)`
  - Add `idx_pmr_session_player` on `player_match_results(session_id, player_id)`
  - Add `idx_players_name_id` on `players(name, id)`
  - All use `CREATE INDEX IF NOT EXISTS`; no existing single-column index is duplicated

- [x] 2. Add scalability RPCs migration
  - Create `supabase/migrations/20260623000001_scalability_rpcs.sql`
  - Add `count_ranked_matches()` RPC returning `bigint` (distinct match_id count from player_match_results)
  - Add `get_player_ranking_summary(p_player_id uuid)` RPC returning `json` with rank, rating, stats from ended sessions; rank = count of higher-rated players + 1; rankChange stubbed as 0
  - Add `get_leaderboard_page(p_limit int, p_offset int)` RPC returning ranked table; tie-breaker: rating → avg weekly pts → win rate → point diff; last_session_delta/rank_change/top_one_week_streak stubbed as 0
  - Add `get_badge_leaders()` RPC returning `(badge_type text, leader_id uuid, leader_count bigint)` for `most_played` and `most_donated` only
  - All functions: `security invoker`, `set search_path = public`, `stable` marker, `CREATE OR REPLACE FUNCTION`

- [x] 3. Replace `useCompletedMatchCount` with RPC call
  - In `src/hooks/useRankings.ts`: replace `supabase.from('player_match_results').select('match_id')` with `supabase.rpc('count_ranked_matches')`
  - Add `staleTime: 60_000`
  - Return type is `number`
  - TypeScript compiles without errors

- [x] 4. Rewrite `usePlayerMatches` with cursor pagination
  - Export `PlayerMatchCursor { played_at: string; id: string }` interface from `src/hooks/usePlayerMatches.ts`
  - Update query to dual-alias select: `player_filter:match_participants!inner(player_id)` for filtering + `participants:match_participants(*, player:players(*))` for full data + `session:sessions(*)`
  - Filter with `.eq('player_filter.player_id', playerId)` and `.eq('status', 'COMPLETED')`
  - Order by `played_at desc, id desc`, limit `PAGE_SIZE = 20`
  - Apply keyset cursor with `.or(...)` when `pageParam` is non-null
  - Return `{ matches, nextCursor }` where `nextCursor` is last row's `{ played_at, id }` or `null`
  - `initialPageParam: null`, `getNextPageParam` returns `lastPage.nextCursor`
  - Add `staleTime: 5 * 60_000`
  - TypeScript compiles without errors

- [x] 5. Rewrite `usePlayerMatchHistory` to consume scoped data
  - Remove `useMatches` and `useSessions` imports from `src/hooks/usePlayerMatchHistory.ts`
  - Import and call `usePlayerMatches(playerId)`; flatten pages with `data?.pages.flatMap(p => p.matches) ?? []`
  - Group by `match.session_id` using embedded `match.session` object
  - Keep identical win/loss counting logic; skip sessions with 0 matches
  - Return `{ history, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage }`
  - Update `PlayerDetailPage.tsx` to render a "Load more" button when `hasNextPage` is true, calling `fetchNextPage` on click
  - TypeScript compiles without errors

- [x] 6. Rewrite `usePlayerPointsHistory` to start from result rows
  - Remove `useMatches` and `useSessions` imports from `src/hooks/usePlayerPointsHistory.ts`
  - Replace with single `useQuery` querying `player_match_results` with nested selects: `match:matches(*, session:sessions(*), teams:match_teams(*), participants:match_participants(*, player:players(*)), scores:match_scores(*))`
  - Filter `.eq('player_id', playerId)`, order by `created_at desc`
  - Query key `['player-points-history', playerId]`, `staleTime: 5 * 60_000`
  - Update `useMemo` to build `SessionPointsHistory[]` using `result.match.session` instead of global sessions lookup
  - TypeScript compiles without errors

- [x] 7. Add `usePlayerRankingSummary` hook and update PlayerDetailPage
  - Create `src/hooks/usePlayerRankingSummary.ts` with `usePlayerRankingSummary(playerId: string)`
  - Call `supabase.rpc('get_player_ranking_summary', { p_player_id: playerId })`
  - Query key `['player-ranking-summary', playerId]`, `staleTime: 60_000`
  - Return type includes `rank`, `rating`, `matchesPlayed`, `wins`, `losses`, `winRate`, `rankChange`
  - In `PlayerDetailPage.tsx`: replace `usePlayerRankings()` + `rankings?.find(...)` with `usePlayerRankingSummary(id)`
  - Remove unused `usePlayerRankings` import from `PlayerDetailPage.tsx`
  - TypeScript compiles without errors

- [x] 8. Replace global scans in `useOpponents` and `useBestPartner`
  - In `src/hooks/useOpponents.ts`: replace `useMatches()` with `usePlayerMatches(playerId)`; flatten pages; keep existing aggregation logic unchanged
  - In `src/hooks/useBestPartner.ts`: replace `useMatches()` with `usePlayerMatches(playerId)`; flatten pages; keep existing aggregation logic unchanged
  - `isLoading` derived from player-scoped query in both hooks
  - TypeScript compiles without errors

- [x] 9. Add `useLeaderboard` hook and update RankingPage
  - Create `src/hooks/useLeaderboard.ts` with `useLeaderboard(pageSize = 50)`
  - Use `useInfiniteQuery` calling `supabase.rpc('get_leaderboard_page', { p_limit: pageSize, p_offset: pageParam })`
  - Query key `['leaderboard']`, `staleTime: 60_000`
  - `getNextPageParam`: return `lastParam + pageSize` when page is full, else `undefined`
  - Map RPC snake_case fields (`player_id`, `avg_weekly_points`, `total_weekly_points`, etc.) to `PlayerRankingStats` camelCase shape
  - In `src/pages/RankingPage.tsx`: replace `usePlayerRankings()` with `useLeaderboard()`; adapt rendering to paginated data
  - Keep `usePlayerRankings()` exported in `useRankings.ts` for SessionDetailPage/SessionStatsPage consumers
  - TypeScript compiles without errors

- [x] 10. Replace global badges scan in `usePlayerBadges`
  - Remove `useMatches`, `useSessions` imports and the `player-match-results-all` unfiltered query from `src/hooks/usePlayerBadges.ts`
  - Derive player-local badge inputs (streak, matches played) from `usePlayerMatches(playerId)` pages
  - Add `useQuery` for `supabase.rpc('get_badge_leaders')` with key `['badge-leaders']` and `staleTime: 5 * 60_000`
  - Award `most_played` and `most_donated` badges by comparing playerId against RPC leader_id rows
  - Omit streak and dynasty global leader badges (deferred to Phase 4)
  - Update `computeBadges` signature to accept player's own match list and badge leader rows
  - TypeScript compiles without errors

- [x] 11. Update mutation cache invalidation
  - In `useMatches.ts` `useCreateMatch.onSuccess`: invalidate `['matches', sessionId]` and `['player-matches']` (all player keys); remove broad `['player-rankings']` invalidation
  - In `useUpdateMatch.onSuccess` and `useRecordResult.onSuccess`: invalidate specific match key and `['player-matches']`; remove `['player-rankings']` invalidation
  - In `useDeleteMatch.onSuccess`: invalidate session-scoped match key and `['player-matches']`
  - Find session-end / rating-recalculation mutation in `useSessions.ts`; add invalidation of `['leaderboard']`, `['player-ranking-summary']` (prefix match), and `['completed-match-count']`
  - TypeScript compiles without errors

- [x] 12. Replace `useSessionLeaderboards` global fetch
  - Find all call sites of `useSessionLeaderboards()` in `SessionsListPage` and `CalendarTab` components
  - Replace with per-session `useSessionLeaderboard(sessionId)` calls on each rendered session card
  - Add `enabled` guard so sessions not yet on screen do not trigger fetches (use intersection observer or visible-session state)
  - `useSessionLeaderboards()` remains exported but is no longer called from user-facing pages
  - TypeScript compiles without errors

## Task Dependency Graph

```
Task 1 (indexes)     ──┐
Task 2 (RPCs)        ──┼──► Task 3 (count RPC)
                        │
                        ├──► Task 4 (cursor pagination) ──► Task 5 (match history)
                        │                                ──► Task 8 (opponents/partners)
                        │                                ──► Task 10 (badges)
                        │
                        ├──► Task 6 (points history)
                        ├──► Task 7 (ranking summary)
                        └──► Task 9 (leaderboard)

Task 5 ──► Task 11 (cache invalidation)
Task 9 ──► Task 11

Task 12 (session leaderboards) — independent
```

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1. Add Phase 2 database indexes migration", "2. Add scalability RPCs migration"] },
    { "wave": 2, "tasks": ["3. Replace `useCompletedMatchCount` with RPC call", "4. Rewrite `usePlayerMatches` with cursor pagination", "6. Rewrite `usePlayerPointsHistory` to start from result rows", "7. Add `usePlayerRankingSummary` hook and update PlayerDetailPage", "9. Add `useLeaderboard` hook and update RankingPage", "12. Replace `useSessionLeaderboards` global fetch"] },
    { "wave": 3, "tasks": ["5. Rewrite `usePlayerMatchHistory` to consume scoped data", "8. Replace global scans in `useOpponents` and `useBestPartner`", "10. Replace global badges scan in `usePlayerBadges`"] },
    { "wave": 4, "tasks": ["11. Update mutation cache invalidation"] }
  ]
}
```

Tasks 1 and 2 can run in parallel. Task 4 must complete before Tasks 5, 8, and 10. Tasks 3, 6, 7, 9, 12 are independent of each other after Task 2.

## Notes

- `usePlayerRankings()` is NOT removed — it is kept for SessionDetailPage, SessionStatsPage, and other consumers that already scope to a session.
- `rankChange`, `topOneWeekStreak`, and `lastSessionRatingDelta` on the leaderboard RPC are stubbed as 0; they will be populated in a Phase 4 follow-up after read models are measured.
- The `get_badge_leaders` RPC only covers `most_played` and `most_donated`. Streak and dynasty badges require session-ordered aggregation that is deferred.
- All TypeScript compilation errors must be resolved before marking a task complete.
