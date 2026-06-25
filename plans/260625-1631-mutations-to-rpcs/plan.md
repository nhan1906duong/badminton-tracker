---
title: "Convert Supabase Direct Table Mutations to Postgres RPCs"
description: "Migrate all write paths from client-side multi-step Supabase calls to atomic SECURITY DEFINER Postgres RPCs across 5 phases."
status: pending
priority: P2
effort: 22h
branch: enhance/scalability
tags: [supabase, postgres, rpc, refactor, scalability, plpgsql]
created: 2026-06-25
---

# Convert Direct Table Mutations to Postgres RPCs

Move every write path off client-orchestrated multi-statement Supabase calls onto single atomic Postgres RPCs (`SECURITY DEFINER`). Eliminates partial-write races, round-trips, and duplicated business logic between TS and DB. Phase 4 ports the Elo algorithm to PL/pgSQL.

## Why

- **Atomicity** — multi-step flows (create match, end session, delete) currently span N client→DB round-trips; a mid-flow failure leaves orphaned rows. One RPC = one transaction.
- **Latency** — `useEndSession` / `useRecalculateAllRatings` do O(matches) sequential round-trips. In-DB loops collapse this.
- **Single source of truth** — Elo + points logic duplicated across `useEndSession`, `useRecordResult`, `useUpdateMatchPlayers`, `useRecalculateAllRatings`. Port once to PL/pgSQL.

## Guiding Decisions

- All RPCs `SECURITY DEFINER`, `set search_path = public`. Admin/auth checks enforced **inside** the RPC via `auth.uid()` + `is_admin()` (see `008_role.sql`) — preserves existing RLS semantics now that direct table writes are replaced.
- RPC parameters map 1:1 to current hook inputs. Composite inputs (scores, player id arrays, league teams) passed as `jsonb`.
- Return shapes designed so hooks keep their current return types — minimize component-level churn. Read queries (`useMatches`, `useSession`, etc.) are NOT touched.
- Each phase = one migration file + the hook edits + tests, shippable independently.
- Preserve existing helpers `refresh_player_session_stats` / `refresh_player_all_time_stats` — call them from inside the new RPCs instead of from the client.
- KISS: do NOT add optimistic-update logic; keep `onSuccess` invalidations exactly as today.

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Simple CRUD RPCs (players, rackets, quotes, sessions-basic, attendances, profiles, avatars) | 4h | pending | [phase-01](./phase-01-simple-crud-rpcs.md) |
| 2 | Match lifecycle RPCs (create, start, reopen, delete, league schedule, reorder queue) | 5h | pending | [phase-02](./phase-02-match-lifecycle-rpcs.md) |
| 3 | Complex match-state RPCs (update match, record result, end no-winner, update players) | 5h | pending | [phase-03](./phase-03-complex-match-state-rpcs.md) |
| 4 | Session + rating RPCs (end session w/ Elo in PL/pgSQL, delete session, clear all, recalculate all) | 6h | pending | [phase-04](./phase-04-session-rating-rpcs.md) |
| 5 | League team RPCs (create/update/delete league teams + roster sync) | 2h | pending | [phase-05](./phase-05-league-team-rpcs.md) |

## Dependencies

- Phase 4 depends on Phase 3 (shares the points/Elo PL/pgSQL helpers introduced in Phase 3).
- Phases 1, 2, 5 are independent and can ship in any order.
- All phases depend on the shared `_apply_match_points` / `_team_avg_rating` PL/pgSQL helpers created **first in Phase 3** (Phase 4 reuses them). If Phase 4 ships before Phase 3, move the helper migration earlier.

## Shared Conventions (all phases)

- Migration filename: `supabase/migrations/2026062500001X_<slug>.sql` (sequential after existing `...0006`).
- Each RPC: `create or replace function`, then `grant execute on function <sig> to authenticated, anon;` matching the table's current grant audience.
- Hook change pattern: replace the `supabase.from(...)` chain inside `mutationFn` with a single `supabase.rpc('<name>', {...})`; keep `onSuccess` invalidations untouched.
- Verify after each phase: `npm run build` (type-check) + `npm run test` + manual smoke via Supabase SQL editor.

## Unresolved Questions

See each phase's "Unresolved Questions" and the consolidated list in [phase-04](./phase-04-session-rating-rpcs.md).
