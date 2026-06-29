---
title: "Postgres DB Optimizations"
description: "Fix RLS performance anti-patterns, SECURITY DEFINER safety gaps, redundant materialized-stat refreshes, and per-row loop queries. Phases 1–4 complete; phases 5–6 cover missed tables from the same anti-patterns."
status: completed
priority: P1
effort: 7.5h
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

## Unresolved Questions

- Phase 3 assumes all-time stats are ONLY needed for ended sessions. Confirm no UI currently shows all-time stats for players mid-session (leaderboard reads `player_all_time_stats` which by definition only has ended-session data — confirmed safe).
