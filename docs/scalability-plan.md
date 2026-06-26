# Badminton App Scalability Plan

Version: v3.0
Status: Ready for implementation
Reviewed: 2026-06-21

## North Star

Scale the app toward 100k players and 1M matches without changing the product
feel. The immediate problem is not that the schema is wrong; it is that several
screens fetch global data and aggregate it in React.

Principles:

- Measure first, then add architecture.
- Make user screens request scoped, page-sized data.
- Prefer indexed queries and SQL/RPC aggregation before read models.
- Use `player_match_results` for per-player result, points, and rating history.
- Add cached read models only after measured indexed queries or RPCs are still
  too slow at realistic sizes.
- Keep correctness-critical updates transactional in Postgres. Use Edge
  Functions only for async, retryable work.

Targets:

- Player detail first render loads at most 20-50 match rows.
- Player detail first history page executes in Postgres under 100 ms.
- Ranking first page executes in Postgres under 250 ms, or is served from a
  measured cache/read model.
- No normal user screen fetches every match, every player, or every
  `player_match_results` row.
- Frontend transforms run over scoped or page-sized data, not whole tables.

Note: the timing targets are database execution targets, not full browser to
Supabase round-trip targets.

## Key Product Semantics To Preserve

Completed matches and ranking-counted matches are not identical today.

`useCompletedMatchCount()` currently counts distinct `match_id` values from
`player_match_results`. That means it counts completed matches with result rows,
not every `matches.status = 'COMPLETED'` row. Before implementing that change,
choose one of these labels and query shapes:

- "Completed matches": count `matches` where `status = 'COMPLETED'`.
- "Ranked matches" or "matches with results": count distinct
  `player_match_results.match_id` in SQL/RPC.

Do not silently switch semantics on the ranking page.

## Current Hot Paths

These paths do not scale to 100k players or 1M matches:

- `PlayerDetailPage.tsx`
  - `usePlayerMatchHistory(playerId)` calls unscoped `useMatches()` and
    `useSessions()`, then filters in React.
  - `usePlayerPointsHistory(playerId)` calls unscoped `useMatches()` and
    `useSessions()`, then joins to this player's result rows in React.
  - The page also calls `usePlayerRankings()` just to find one player's ranking
    summary.
- Player detail sheets
  - `useOpponents(playerId)` and `useBestPartner(playerId)` call unscoped
    `useMatches()`.
  - `usePlayerBadges(playerId)` calls unscoped `useMatches()`, `useSessions()`,
    and all `player_match_results`.
- Ranking and calendar
  - `usePlayerRankings()` fetches all players, all match results, and all ended
    sessions, then aggregates in React.
  - `useSessionLeaderboards()` fetches all players and all result rows for all
    sessions. It is used by `SessionsListPage` and `CalendarTab`.
  - `useCompletedMatchCount()` downloads every result `match_id` and counts
    distinct IDs in React.
- Global list hooks
  - `usePlayers()` fetches every player and orders in one result set.
  - `useMatches()` with no `sessionId` fetches every match with nested teams,
    participants, players, and scores.
  - `usePlayerMatches(playerId)` exists and is scoped, but uses OFFSET
    pagination through `.range(from, to)`.
- Other global scans to revisit after the first wins
  - `useH2HPairs()` calls unscoped `useMatches()`.
  - `useMenDoublesRankings()` calls unscoped `useMatches()`.

Session-scoped pages that call `useMatches(sessionId)` are acceptable for
ordinary sessions. Keep watching tournament and league sessions that can grow
large.

## Phase 0: Baseline And Guardrails

Objective: get enough measurement to avoid building the wrong cache.

Tasks:

- Capture row counts:

```sql
select 'players' as table_name, count(*) from players
union all select 'matches', count(*) from matches
union all select 'match_teams', count(*) from match_teams
union all select 'match_participants', count(*) from match_participants
union all select 'match_scores', count(*) from match_scores
union all select 'sessions', count(*) from sessions
union all select 'player_match_results', count(*) from player_match_results;
```

- Capture browser payload size, request count, and render time for:
  - `PlayerDetailPage`
  - `RankingPage`
  - `SessionsListPage`
  - `CalendarTab`
- Capture query plans with `EXPLAIN (ANALYZE, BUFFERS)` or Supabase query
  plans for the new player-history, leaderboard, and count queries.
- Add a short note to `docs/database-optimization.md` whenever an optimization
  is completed, including before/after numbers when available.

Acceptance:

- Every later phase has a before/after timing or a written reason it was
  skipped.
- No new table, cache, or background job is added without a measured query
  bottleneck.

## Phase 1: Remove Global Fetches From User Screens

Objective: make the frontend ask for the data it actually needs.

Recommended implementation order:

1. Replace the count query.
2. Convert `usePlayerMatches(playerId)` to cursor pagination.
3. Make `usePlayerMatchHistory(playerId)` consume the scoped match query.
4. Make `usePlayerPointsHistory(playerId)` start from `player_match_results`.
5. Move player detail sheets away from global `useMatches()`.

### 1.1 Replace Completed/Ranked Match Count

If the UI should show all completed matches:

```ts
const { count, error } = await supabase
  .from('matches')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'COMPLETED')
```

If the UI should preserve current "matches with result rows" behavior, add an
RPC:

```sql
create or replace function count_ranked_matches()
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select count(distinct match_id)
  from player_match_results;
$$;
```

Acceptance:

- `useCompletedMatchCount()` no longer downloads all result rows.
- The UI label matches the chosen counting semantics.

### 1.2 Make Player Matches Player-Scoped And Cursor-Based

Replace OFFSET pagination in `usePlayerMatches(playerId)` with keyset
pagination on `(played_at DESC, id DESC)`.

Important Supabase/PostgREST detail: use one embedded relation to filter and a
separate embedded relation to return all participants. Filtering directly on
`participants:match_participants!inner(*)` can leave the UI with only the target
player in the returned participant list.

Target query shape:

```ts
let query = supabase
  .from('matches')
  .select(`
    *,
    session:sessions(*),
    teams:match_teams(*),
    participants:match_participants(*, player:players(*)),
    player_filter:match_participants!inner(player_id),
    scores:match_scores(*)
  `)
  .eq('player_filter.player_id', playerId)
  .eq('status', 'COMPLETED')
  .order('played_at', { ascending: false })
  .order('id', { ascending: false })
  .limit(pageSize)

if (cursor) {
  query = query.or(
    `played_at.lt.${cursor.played_at},` +
      `and(played_at.eq.${cursor.played_at},id.lt.${cursor.id})`,
  )
}
```

Return the last row's `{ played_at, id }` as the next cursor. Keep sorting
`scores` by `set_number` after fetch.

Acceptance:

- `usePlayerMatches(playerId)` uses `useInfiniteQuery` with a cursor object, not
  a page number.
- The returned match rows still include all participants, teams, scores, and
  the session needed by the UI.
- Initial player detail history loads only the first page.

### 1.3 Make Player Match History Consume Scoped Data

Replace `usePlayerMatchHistory(playerId)` so it no longer calls unscoped
`useMatches()` or `useSessions()`.

Short-term path:

- Reuse the improved `usePlayerMatches(playerId)`.
- Group only the loaded page(s) by `session_id`.
- Use the embedded `session:sessions(*)` data instead of a global sessions list.
- Keep win/loss counting over the returned match participants and teams.

Acceptance:

- `PlayerDetailPage` history does not load global matches or global sessions.
- Session grouping works over player-scoped rows.
- Empty, loading, and "load more" states are explicit.

### 1.4 Make Player Points History Start From Result Rows

Current flow:

- Fetch all matches.
- Fetch all sessions.
- Fetch this player's `player_match_results`.
- Join everything in React.

Target flow:

- Query `player_match_results.eq('player_id', playerId)`.
- Include the referenced match and session data through nested selects when
  practical.
- Use an RPC if nested ordering or shape becomes awkward.

Possible query shape:

```ts
const { data, error } = await supabase
  .from('player_match_results')
  .select(`
    *,
    match:matches(
      *,
      session:sessions(*),
      teams:match_teams(*),
      participants:match_participants(*, player:players(*)),
      scores:match_scores(*)
    )
  `)
  .eq('player_id', playerId)
  .order('created_at', { ascending: false })
```

Acceptance:

- `usePlayerPointsHistory(playerId)` does not call unscoped `useMatches()` or
  `useSessions()`.
- Rating chart data is built from player-scoped result rows.

### 1.5 Replace Opponent, Partner, Badge Global Scans

For `useOpponents(playerId)` and `useBestPartner(playerId)`:

- Short term: compute from loaded player-scoped match pages if that UX only
  needs a recent summary.
- Full-history path: add RPCs that aggregate opponents and partners by player.
- Later cache path: add `player_relationship_stats` only if the RPC is too slow.

For `usePlayerBadges(playerId)`:

- Split badge types by cost.
- Player-local badges can come from scoped result rows.
- Global "leader" badges need either RPC aggregation or a read model. Do not
  keep loading all matches/results on player detail.

Acceptance:

- No player detail drawer/sheet calls unscoped `useMatches()`.
- Expensive all-player badges are either deferred, server-aggregated, or backed
  by a measured read model.

### 1.6 Limit Global List Hooks

Replace broad list hooks on scalable screens with paginated/search hooks:

- `usePlayersPage({ cursor, search })`
- `usePlayerSearch(searchTerm)`
- `useMatchesPage({ cursor, filters })`
- `useSessionLeaderboardsPage({ cursor })` or session-specific leaderboard
  queries for calendar/list pages

Acceptance:

- `usePlayers()` is used only on workflows that genuinely need every player,
  such as small-club match creation, admin settings, or controlled local tools.
- Global match browsing is paginated or intentionally limited.

## Phase 2: Add The Right Indexes

Objective: support the new query shapes without duplicating existing indexes.

Already present:

- `idx_matches_played_at` on `matches(played_at DESC)`
- `idx_matches_status` on `matches(status)`
- `idx_matches_session_id` on `matches(session_id)`
- `idx_match_teams_match_id` on `match_teams(match_id)`
- `idx_match_participants_match_id` on `match_participants(match_id)`
- `idx_match_participants_player_id` on `match_participants(player_id)`
- `idx_match_scores_match_id` on `match_scores(match_id)`
- `idx_pmr_player_id` on `player_match_results(player_id)`
- `idx_pmr_match_id` on `player_match_results(match_id)`
- `idx_pmr_session_id` on `player_match_results(session_id)`
- Unique index from `player_match_results(player_id, match_id)`

Add a migration for missing composite, partial, and FK-side indexes:

```sql
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

Notes:

- `idx_players_name_id` helps ordered/prefix-style player pages. If the product
  needs arbitrary substring search, measure and consider `pg_trgm` separately.
- For large production tables, plan heavy index creation around the migration
  runner. `CREATE INDEX CONCURRENTLY` avoids long write locks but cannot run
  inside a transaction block.
- Do not add duplicate single-column indexes that already exist.

RLS cleanup:

- Wrap `auth.uid()` calls in `(select auth.uid())` in policies that still use
  row-by-row checks.
- Keep indexes on columns used by policies, especially `created_by` and foreign
  keys used inside policy subqueries.
- For complex repeated policy checks, consider a private `security definer`
  helper only if the function includes an explicit caller check and direct
  execution is revoked from roles that should not call it.

Acceptance:

- New player-scoped history queries use index scans or bounded nested loops in
  query plans.
- Completed session queries use a composite or partial index.
- Missing FK-side indexes are covered.
- RLS policies no longer repeatedly evaluate `auth.uid()` per candidate row.

## Phase 3: Move Ranking Aggregation To Postgres

Objective: stop downloading all ranking inputs into React.

Split this into two steps so the UI can improve before all ranking extras are
perfect.

### 3.1 Leaderboard Page RPC

Replace `usePlayerRankings()` on `RankingPage` with a paginated SQL/RPC
leaderboard. Return only the visible page:

- player id
- name
- avatar URL
- rating
- matches played
- wins/losses/win rate
- total and average weekly points
- points for/against/difference
- total rating delta
- rank
- rank change if available
- top-one-week streak if available

Keep tie-breaker parity with current React sorting:

1. rating descending
2. average weekly points descending
3. win rate descending
4. point difference descending

Acceptance:

- `RankingPage` does not fetch all players, all result rows, or all ended
  sessions.
- The first leaderboard page is returned by one RPC or one page-sized query.
- Tie-breaker tests pass before and after moving aggregation.

### 3.2 Player Detail Ranking Summary

`PlayerDetailPage` currently calls the full ranking hook to find one player.
Replace that with either:

- `get_player_ranking_summary(player_id)`, or
- a leaderboard-cache lookup after Phase 4 exists.

Acceptance:

- Opening one player detail page does not compute or fetch the whole
  leaderboard.

### 3.3 Session Leaderboards

Replace `useSessionWeeklyRankings(sessionId)` and
`useSessionLeaderboard(sessionId)` with session-scoped SQL aggregation if large
sessions become slow.

Replace `useSessionLeaderboards()` with one of:

- page-sized session leaderboard summaries for list/calendar views, or
- a `session_leaderboard_cache`/`player_session_stats` read model if measured
  list/calendar queries are too slow.

Acceptance:

- `SessionsListPage` and `CalendarTab` do not fetch every result row for every
  session.

## Phase 4: Add Read Models Only When Measurements Require Them

Objective: cache aggregate data only where normal indexed queries or RPCs are
too slow.

Likely read models, in order:

1. `player_stats`
   - One row per player.
   - Stores all-time matches, wins, losses, points for/against, rating deltas,
     and last played timestamps.
2. `player_session_stats`
   - One row per player per session.
   - Replaces repeated weekly/session aggregation.
3. `leaderboard_cache`
   - Stores current rank, rank change, rating, and leaderboard tie-break fields.
   - Supports fast ranking pages and top-N widgets.
4. `player_relationship_stats`
   - Optional.
   - Stores opponent and partner aggregates for player detail sheets.

Avoid creating `player_history` first. Full player history can be paginated from
`matches`, `match_participants`, and `player_match_results`. Create a history
table only if query plans prove indexed, paginated history is still too slow.

Projection strategy:

- Prefer a database RPC run during session end/recalculation when the update
  must be transactional.
- Use Edge Functions only for async work that can be retried without breaking
  correctness.
- Add a backfill path for each read model.
- Store `calculated_at` and, where useful, a `source_version` or
  `source_session_id` so stale aggregates can be detected.

Acceptance:

- Each read model has a documented owner, source tables, backfill path, update
  path, and staleness behavior.
- Session end/recalculation updates base rows and derived rows consistently.
- If a projection fails, the app can retry or mark the aggregate stale.

## Phase 5: Frontend Cache And Pagination

Objective: make TanStack Query cache scoped data cleanly.

Tasks:

- Keep TanStack Query. It is already installed and used.
- Use specific query keys:
  - `['player-matches', playerId]`
  - `['player-points-history', playerId]`
  - `['player-ranking-summary', playerId]`
  - `['leaderboard', filters]`
  - `['session-leaderboard', sessionId]`
- Use `useInfiniteQuery` for history and global browsing.
- Invalidate only affected keys after match create/update/delete, session end,
  and rating recalculation.
- Set reasonable `staleTime` for mostly historical data.

Acceptance:

- Mutations do not invalidate every broad query unless the mutation truly
  changes global ranking data.
- Player history uses cursor pagination everywhere.
- Query keys include every variable that changes returned data.

## Phase 6: Realtime And Operational Scaling

Objective: avoid broad subscriptions and expensive background work.

Realtime rules:

- Session page: subscribe to one session's matches.
- Player page: subscribe only to rows for that player if live updates are
  needed.
- Ranking page: subscribe to leaderboard cache/version changes, not every
  match.

Operational rules:

- Track slow queries with Supabase/Postgres tools before adding more caching.
- Add indexes before read models when the plan shows sequential scans on hot
  paths.
- Revisit connection pooling only when server-side/Edge Function traffic grows.
- No background job should recompute every player on every match completion.

Acceptance:

- No app-wide match subscription.
- No unbounded recomputation on a common user action.

## Implementation Milestones

### Milestone A: Immediate, Highest Return

- [ ] Decide whether the ranking page count means completed matches or ranked
      matches.
- [ ] Replace `useCompletedMatchCount()` with DB count/RPC.
- [ ] Convert `usePlayerMatches(playerId)` to keyset pagination.
- [ ] Refactor `usePlayerMatchHistory(playerId)` to use scoped player matches.
- [ ] Refactor `usePlayerPointsHistory(playerId)` to avoid unscoped
      `useMatches()` and `useSessions()`.
- [ ] Add Phase 2 migration indexes.

### Milestone B: Player Detail Scale

- [ ] Replace player detail's full `usePlayerRankings()` call with one-player
      ranking summary.
- [ ] Refactor `useOpponents(playerId)` to use scoped data or an RPC.
- [ ] Refactor `useBestPartner(playerId)` to use scoped data or an RPC.
- [ ] Refactor `usePlayerBadges(playerId)` to avoid all-match/all-result scans.
- [ ] Add regression tests for history grouping, W/L counts, opponent stats,
      partner stats, and badges.

### Milestone C: Leaderboard And Calendar Scale

- [ ] Replace `usePlayerRankings()` with a paginated SQL/RPC leaderboard.
- [ ] Replace `useSessionLeaderboards()` with page-sized summaries or a measured
      read model.
- [ ] Replace all-player `usePlayers()` usage on scalable screens with search
      or pagination.
- [ ] Add ranking tie-breaker tests before and after moving aggregation.

### Milestone D: Conditional Read Models

- [ ] Add `player_stats` only if player summary/leaderboard RPCs stay too slow.
- [ ] Add `player_session_stats` only if session aggregation is too slow.
- [ ] Add `leaderboard_cache` when ranking must stay fast at 100k players.
- [ ] Add `player_relationship_stats` only if relationship RPCs are too slow.
- [ ] Add backfill and retry documentation for every projection.

## First PR Recommendation

Start with a small PR that proves the pattern:

1. Add the Phase 2 indexes.
2. Replace `useCompletedMatchCount()`.
3. Convert `usePlayerMatches(playerId)` to cursor pagination.
4. Refactor `usePlayerMatchHistory(playerId)` to consume `usePlayerMatches`.
5. Add or update tests around history grouping and count semantics.

This PR removes one global download and gives the player detail page its
scalable data path without introducing new tables.

## Deferred From Earlier Drafts

- "Add TanStack Query" is not needed; the project already uses it.
- Edge Functions are not the first choice for correctness-critical projection
  updates. Prefer transactional RPCs first.
- `player_history` is not required until indexed, paginated history queries are
  measured and proven insufficient.
- Single-column indexes already present in migrations should not be re-added.
- Read models should not be created before indexed scoped queries and RPCs have
  been measured.
