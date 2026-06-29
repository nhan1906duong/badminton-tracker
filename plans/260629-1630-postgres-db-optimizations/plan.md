---
title: "Postgres DB Optimizations"
description: "Fix RLS performance anti-patterns, SECURITY DEFINER safety gaps, redundant materialized-stat refreshes, and per-row loop queries. All 10 phases complete."
status: completed
priority: P1
effort: 12h
branch: feature/supabase-enhance
tags: [supabase, postgres, rls, security, performance, optimization]
created: 2026-06-29
---

# Postgres DB Optimizations

Four phases of targeted DB fixes identified by a Supabase Postgres best-practices audit. No hook or UI changes — pure migration files that improve correctness, security, and query performance.

## Why

- **RLS `auth.uid()` called per row** → function re-evaluated for every row scanned; wrapping in `(select ...)` caches it for the entire query. 5–100x slower otherwise on large tables.
- **`is_admin()` lacks `set search_path`** → SECURITY DEFINER functions without a fixed search_path are vulnerable to schema hijacking. Also evaluated per row in DELETE policies.
- **`refresh_player_all_time_stats()` runs on every match result** → all-time stats only aggregate *ended* sessions, so calling this during a live match is pure wasted I/O.
- **`reorder_queue` + session rating loops** → per-row PL/pgSQL loops that can be collapsed into single-statement batches.

## Guiding Decisions

- Migrations only — no TypeScript hook changes required for any phase.
- Each phase ships as one migration file, independently deployable.
- `CREATE OR REPLACE` / `DROP POLICY IF EXISTS` + `CREATE POLICY` pattern — idempotent and safe to re-run.
- No RLS semantics change — only *how* auth checks are evaluated, not *who* passes them.

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Fix RLS `auth.uid()` per-row anti-pattern | 1h | completed | [phase-01](./phase-01-rls-auth-uid-fix.md) |
| 2 | Harden `is_admin()` + fix per-row policy calls | 1h | completed | [phase-02-is-admin-security-fix.md](./phase-02-is-admin-security-fix.md) |
| 3 | Eliminate redundant `refresh_player_all_time_stats` calls | 1.5h | completed | [phase-03-eliminate-redundant-all-time-stats-refresh.md](./phase-03-eliminate-redundant-all-time-stats-refresh.md) |
| 4 | Batch `reorder_queue` + optimize session rating loops | 2.5h | completed | [phase-04-batch-updates-query-optimization.md](./phase-04-batch-updates-query-optimization.md) |
| 5 | Fix per-row `auth.uid()` / `is_admin()` on `player_rackets`, `player_quotes`, `profiles` | 0.5h | completed | `supabase/migrations/20260630000005_fix-rls-missed-tables.sql` |
| 6 | Index `players.rating` for rank subquery + document `pmr` write policies | 0.5h | completed | `supabase/migrations/20260630000006_players-rating-index-and-pmr-policy-doc.sql` |
| 7 | Fix authorization bypass in SECURITY DEFINER racket/quote CRUD RPCs | 1h | completed | `supabase/migrations/20260701000001_fix-secdef-racket-quote-authz.sql` |
| 8 | Fix `SET search_path = public` → `''` in all remaining SECURITY DEFINER functions | 1.5h | completed | `supabase/migrations/20260701000002_fix-secdef-search-path.sql` |
| 9 | Wire `useLeaderboard` + `usePlayerRankingSummary` to `player_all_time_stats` table | 0h | completed | already done — hooks read materialized table directly |
| 10 | Add partial index on `sessions` for ended sessions + fix EXISTS→JOIN in session stats | 0.5h | completed | `supabase/migrations/20260701000003_sessions-ended-index.sql` (JOIN fix in Phase 8) |
| 11 | Fix `set search_path = public` on `get_badge_leaders` + old scalability RPCs + indexes | 0.5h | completed | `supabase/migrations/20260701000004_fix-badge-leaders-rpc-search-path-and-indexes.sql` |

## Dependencies

- All 4 phases are independent and can ship in any order.
- Phase 2 should ship before or with Phase 1 since both touch DELETE policies on the same tables.
- Phase 3 is the highest-impact runtime fix and can ship first without any other phase.

## Shared Conventions

- Migration filename pattern: `supabase/migrations/2026063X000000_<slug>.sql`
- Verify after each phase: `npm run build` (type-check) + `npm run test`
- No Supabase client changes — all fixes are pure SQL migrations.

## Post-Audit Findings (2026-06-29)

Phases 1–2 fixed sessions/matches/match_teams/match_participants/match_scores but missed three tables with the same anti-patterns:

| Table | Issue | Fix |
|-------|-------|-----|
| `player_rackets` | `auth.uid()` + `is_admin()` called per row in INSERT/UPDATE/DELETE policies (`019_player_rackets.sql`) | Wrap in `(select ...)` — Phase 5 |
| `player_quotes` | Same as above (`021_player_quotes.sql`) | Wrap in `(select ...)` — Phase 5 |
| `profiles` | `auth.uid()` called per row in `profiles_update_own` policy (`009_user_player_link.sql`) | Wrap in `(select auth.uid())` — Phase 5 |

Additional low-priority findings for Phase 6:
- `get_player_ranking_summary` computes rank via a correlated full-scan of `players` — a functional index on `coalesce(rating, 1000) DESC` would future-proof it.
- `pmr_insert`/`pmr_update` use `WITH CHECK (true)` — any authenticated user can write `player_match_results` directly via PostgREST, bypassing SECURITY DEFINER RPC scoring logic. Phase 6 adds a clear comment documenting the intentional trade-off; a proper fix (revoke direct write access) is out of scope.

## Second Audit Findings (2026-06-29)

Full re-audit against all 8 Supabase best-practice categories after phases 1–6 shipped.

### CRITICAL

| Finding | Tables / Functions | Fix |
|---------|--------------------|-----|
| Authorization bypass in SECURITY DEFINER racket/quote RPCs | `create_player_racket`, `update_player_racket`, `delete_player_racket`, `create_player_quote`, `update_player_quote`, `delete_player_quote` | Add ownership check (`profiles.player_id` match or `is_admin()`) inside function body — Phase 7 |
| `SET search_path = public` in SECURITY DEFINER functions | All CRUD + session + rating RPCs except `is_admin()` | Change to `SET search_path = ''` and qualify all object refs as `public.xxx` — Phase 8 |

**Why #1 is critical:** SECURITY DEFINER bypasses RLS. The ownership policies on `player_rackets` / `player_quotes` (own-player or admin) are skipped entirely. Any authenticated user can call `delete_player_racket(any_id)` via PostgREST RPC and delete anyone's racket.

**Why #2 matters:** A user who can CREATE in the `public` schema can shadow `public.profiles` or `public.players` with a hijacked version, causing `is_admin()` checks inside those functions to consult the shadow table instead of the real one.

### HIGH

| Finding | Impact | Fix |
|---------|--------|-----|
| `player_all_time_stats` table populated but never read | Every leaderboard page load runs a full multi-CTE aggregation over `player_match_results` instead of an O(1) table read | Update `useLeaderboard` + `usePlayerRankingSummary` hooks — Phase 9 |
| Missing partial index on `sessions(id) WHERE ended_at IS NOT NULL` | All leaderboard/badge/stats RPCs do a full sessions scan for this filter | New migration — Phase 10 |

### MEDIUM

| Finding | Impact | Fix |
|---------|--------|-----|
| Correlated EXISTS subquery in `refresh_player_session_stats` | Per-match EXISTS lookup; rewrite as INNER JOIN to `match_teams WHERE is_winner = true` | Phase 10 |
| Open INSERT/UPDATE on `player_match_results` (accepted risk) | Any authenticated user can write PMR directly, bypassing scoring RPC logic | Document only (done in Phase 6); proper fix = revoke direct write access; deferred |

### LOW

| Finding | Fix |
|---------|-----|
| `recalculate_all_ratings` uses `DROP TABLE IF EXISTS + CREATE TEMP TABLE` inside session loop | Replace with `TRUNCATE + INSERT` to avoid DDL-in-loop schema locks |

## Third Audit Findings (2026-06-29)

Full re-audit after all 10 phases shipped. Three remaining issues found.

### HIGH

| Finding | Tables / Functions | Fix |
|---------|--------------------|-----|
| `get_badge_leaders()` still has `set search_path = public` | `get_badge_leaders` (redefined in `20260626000001`) — missed by Phase 8 | Add to Phase 11 migration: redefine with `set search_path = ''` + `public.` qualifiers |

**Why it matters:** Phase 8 fixed all functions covered by `20260701000002_fix-secdef-search-path.sql` but `get_badge_leaders()` was redefined in `20260626000001_badge_leaders_session_stats.sql` and not included in that migration. It's `security invoker` so risk is lower than SECURITY DEFINER, but any user who can `CREATE` in `public` can shadow tables it queries, giving wrong badge results.

### MEDIUM

| Finding | Tables / Functions | Fix |
|---------|--------------------|-----|
| Old scalability RPCs still have `set search_path = public` | `count_ranked_matches()`, `get_player_ranking_summary()`, `get_leaderboard_page()` in `20260623000001` | Phase 11: redefine with `set search_path = ''` (functions are superseded but still callable on the DB) |

### LOW

| Finding | Impact | Fix |
|---------|--------|-----|
| No index on `matches.created_by` | `sessions.created_by` has `idx_sessions_created_by` but `matches.created_by` is unindexed — slow CASCADE on auth-user deletion | Add in Phase 11 migration |
| No covering index for `player_match_results` badge aggregations | `get_badge_leaders()` full-scans PMR for `count(distinct match_id)` and `count(*) FILTER (WHERE NOT is_winner)` — heap fetch per row | Add `(player_id, is_winner, match_id)` composite index in Phase 11 |

## Unresolved Questions

- Phase 3 assumes all-time stats are ONLY needed for ended sessions. Confirm no UI currently shows all-time stats for players mid-session (leaderboard reads `player_all_time_stats` which by definition only has ended-session data — confirmed safe).
- Phase 9: confirm `player_all_time_stats` schema matches the `PlayerRankingStats` TypeScript type expected by `useLeaderboard` before removing the `get_leaderboard_page` RPC call.
