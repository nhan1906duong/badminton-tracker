# Scalability Requirements

## Overview

The app must scale toward 100k players and 1M matches without changing the product feel.
The root problem is that several screens fetch global data (all matches, all players, all
results) and aggregate it in React. This must be eliminated on every user-facing screen.

## Requirements

### REQ-1: Completed/Ranked Match Count

The `useCompletedMatchCount()` hook must NOT download every `player_match_results` row to
count distinct match IDs in React.

**Acceptance:**
- The hook uses a server-side count (either `matches.status = 'COMPLETED'` with `count:
  'exact'` or a `count_ranked_matches()` RPC).
- The UI label matches the chosen counting semantics and is documented.

---

### REQ-2: Cursor-Based Player Match Pagination

`usePlayerMatches(playerId)` must use keyset (cursor) pagination instead of OFFSET
(`.range(from, to)`).

**Acceptance:**
- The hook uses `useInfiniteQuery` with a cursor object `{ played_at, id }`, not a page
  number.
- The Supabase query uses a dual-alias select (`player_filter:match_participants!inner` for
  filtering, `participants:match_participants` for returning all participants) so the full
  participant list is preserved.
- Scores are ordered by `set_number` after fetch.
- The initial player detail history load requests only the first page.

---

### REQ-3: Player Match History Is Player-Scoped

`usePlayerMatchHistory(playerId)` must not call the unscoped `useMatches()` or
`useSessions()` hooks.

**Acceptance:**
- History data comes from `usePlayerMatches(playerId)`.
- Session grouping works over the player-scoped rows using the embedded
  `session:sessions(*)` data.
- Win/loss counting runs over the loaded pages, not a global match list.
- Empty, loading, and "load more" states are explicit in the UI.

---

### REQ-4: Player Points History Is Player-Scoped

`usePlayerPointsHistory(playerId)` must not call the unscoped `useMatches()` or
`useSessions()` hooks.

**Acceptance:**
- The hook queries `player_match_results` filtered by `player_id` and uses nested
  selects to include match and session data.
- The rating chart data is built from player-scoped result rows.

---

### REQ-5: Player Detail Ranking Summary Is Single-Player

`PlayerDetailPage` must not call `usePlayerRankings()` (the full leaderboard) just to find
one player's rank.

**Acceptance:**
- Opening a single player detail page does not fetch or compute the whole leaderboard.
- A scoped RPC or targeted query returns rank, rating, matches played, wins, losses, and
  rankChange for one player.

---

### REQ-6: Player Detail Sheets Avoid Global Matches

`useOpponents(playerId)` and `useBestPartner(playerId)` must not call the unscoped
`useMatches()` hook.

**Acceptance:**
- Both hooks derive data from player-scoped match data or dedicated RPCs.
- No player detail drawer/sheet triggers a global match scan.

---

### REQ-7: Player Badges Avoid Global Scans

`usePlayerBadges(playerId)` must not call unscoped `useMatches()`, `useSessions()`, or
`player_match_results` without a player filter for "leader" badges.

**Acceptance:**
- Player-local badges (streak, matches played) come from scoped result rows.
- Global "leader" badges (most played, best streak, dynasty, most titles, most donated) use
  either RPC aggregation or a measured read model.
- The hook no longer fetches all matches and all sessions globally.

---

### REQ-8: Add Phase 2 Database Indexes

A Supabase migration must add the composite, partial, and FK-side indexes described in
Phase 2 of the scalability plan, without duplicating existing single-column indexes.

**Acceptance:**
- Migration file adds these indexes (using `CREATE INDEX IF NOT EXISTS`):
  - `idx_matches_session_status` on `matches(session_id, status)`
  - `idx_matches_completed_session_played_id` (partial, WHERE status = 'COMPLETED') on
    `matches(session_id, played_at DESC, id DESC)`
  - `idx_match_participants_team_id` on `match_participants(team_id)`
  - `idx_match_participants_player_match` on `match_participants(player_id, match_id)`
  - `idx_pmr_player_created_match` on `player_match_results(player_id, created_at DESC,
    match_id)`
  - `idx_pmr_session_player` on `player_match_results(session_id, player_id)`
  - `idx_players_name_id` on `players(name, id)`
- No existing single-column index is duplicated.

---

### REQ-9: Leaderboard Page Uses Paginated Server Aggregation

`RankingPage` must not fetch all players, all result rows, or all ended sessions to
compute rankings in React.

**Acceptance:**
- A `get_leaderboard_page(page_size, cursor)` RPC or page-sized query returns one page of
  ranked players.
- The returned fields match the current `PlayerRankingStats` shape (rating, matches played,
  wins/losses, win rate, weekly points, averages, point difference, rating delta, rank,
  rank change, top-one-week streak).
- Tie-breaker ordering (rating → avg weekly points → win rate → point difference) is
  identical to the current React sort.

---

### REQ-10: Session Leaderboards Avoid Global Result Scan

`useSessionLeaderboards()` (used by `SessionsListPage` and `CalendarTab`) must not fetch
every `player_match_results` row for every session.

**Acceptance:**
- List and calendar views use page-sized session leaderboard summaries.
- Individual session leaderboards (`useSessionLeaderboard(sessionId)`) remain session-scoped
  and are unchanged.

---

### REQ-11: Global Player List Is Scoped On Scalable Screens

`usePlayers()` (all players, no filter) must not be called on screens that show paginated
or searched content.

**Acceptance:**
- Scalable screens (ranking page, player search/browse) use `usePlayersPage({ cursor,
  search })` or `usePlayerSearch(searchTerm)`.
- `usePlayers()` remains available for small-club workflows: match creation (player
  selection), admin settings, and similar bounded flows.

---

### REQ-12: Scoped TanStack Query Keys And Cache Invalidation

All new hooks must use specific query keys and invalidate only affected keys after
mutations.

**Acceptance:**
- Query keys include every variable that changes returned data (e.g., `['player-matches',
  playerId]`, `['player-ranking-summary', playerId]`, `['leaderboard', filters]`).
- Match create/update/delete invalidates session-scoped and player-scoped keys, not every
  broad query.
- Session end and rating recalculation invalidate leaderboard and ranking summary keys.
- Historical data hooks use appropriate `staleTime`.
