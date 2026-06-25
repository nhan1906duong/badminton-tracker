---
name: project-elo-plpgsql-port
description: Constraints when porting the badminton Elo/points algorithm from TS (src/lib/rating.ts) to PL/pgSQL RPCs
metadata:
  type: project
---

Porting `src/lib/rating.ts` (Elo + weekly-points) to PL/pgSQL as part of the "mutations to RPCs" migration (plan: `plans/260625-1631-mutations-to-rpcs/`).

**Why:** Elo/points logic was duplicated across 4 hooks (useEndSession, useRecordResult, useUpdateMatchPlayers, useRecalculateAllRatings). Porting to shared PL/pgSQL helpers makes Postgres the single source of truth and lets the multi-step write flows run atomically in one RPC.

**How to apply (load-bearing gotchas):**
- `calculateRatingDelta` uses JS `Math.round` (half toward +infinity). PG `round(numeric)` is half-away-from-zero. They diverge for negative `.5` values, and Elo deltas CAN be negative. Replicate JS rounding in PL/pgSQL as `floor(x + 0.5)`, NOT `round()`.
- Session-end Elo is **order-dependent**: ratings compound match-by-match in `played_at ASC` order within a session. Must use a cursor/loop with a running rating map (temp table), not a set-based UPDATE.
- `recalculate_all_ratings`: ended sessions commit Elo + advance running map; open sessions store points only with `rating_*` columns null and do NOT advance the map.
- Tier boundaries (score-diff bonus, close-game bonus, strength bonus) are governed by CLAUDE.md's "Scoring System Change Checklist" — the PL/pgSQL helpers are a NEW edit site that should be added to that checklist.
- Always parity-test PL/pgSQL output against `src/lib/rating.test.ts` cases before flipping hooks.

See [[project-rpc-conventions]].
