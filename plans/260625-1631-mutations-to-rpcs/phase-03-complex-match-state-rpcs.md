# Phase 3 — Complex Match-State RPCs (points logic)

## Context Links
- Overview: [plan.md](./plan.md)
- Hook: `src/hooks/useMatches.ts` (`useUpdateMatch`, `useUpdateMatchPlayers`, `useRecordResult`, `useEndMatchNoWinner`)
- Points algorithm (TS, to port): `src/lib/rating.ts` (`calculateMatchPoints`, `teamAvgRating`, score/strength bonus tiers, `SCORING_CONFIG`)
- Scoring spec: `docs/specs/player_rating_and_point_system_spec.md`

## Overview
- **Priority:** P2 — these flows recompute `player_match_results` and are duplicated 3×. Highest correctness value.
- **Status:** pending
- **Introduces the shared PL/pgSQL points helpers** that Phase 4 also depends on. Build these first.

## Key Insights
- `useRecordResult`, `useUpdateMatchPlayers`, and (Phase 4) `useEndSession`/`useRecalculate` all duplicate `calculateMatchPoints` + `teamAvgRating` in TS. Port once to PL/pgSQL helpers, reuse everywhere.
- The **points** breakdown (`base/attendance/score/strength/total`) is independent of Elo. Elo (`rating_before/after/delta`) is only written at session-end (Phase 4). So the helpers split cleanly: `_match_points(...)` (Phase 3) and `_expected_win_rate`/`_rating_delta` (Phase 4).
- `useRecordResult` re-fetches the match after writing scores to read current player ratings — in PL/pgSQL this is a single query, no round-trip.
- `useEndMatchNoWinner` clears `player_match_results` and sets all teams `is_winner=false`; no points written.

## Shared PL/pgSQL helpers (in `20260625000012_rating_helpers.sql`, applied FIRST)

Port from `src/lib/rating.ts`. Use `SCORING_CONFIG`: initialRating 1000, kFactor 32, winBasePoints 10, lossBasePoints 3, attendancePoints 1, minMatchPoints 1.

```sql
-- team average rating; null/empty -> 1000
create or replace function _team_avg_rating(p_ratings numeric[]) returns numeric ...

-- winner score-difference bonus: diff<=4 ->1, <=10 ->2, <=16 ->3, else 4
-- loser close-game bonus: >=19 ->3, >=16 ->2, >=13 ->1, else 0
-- winner strength bonus (gap = opp - winner): <-100 ->0, <=100 ->1, <=250 ->2, <=400 ->4, else 6
-- loser strength adj (gap = loser - winner): >250 ->-3, >100 ->-2, else 0
-- returns total = greatest(1, base + attendance + scoreBonus + strengthBonus)
create or replace function _match_points(
  p_is_winner boolean, p_team_score int, p_opp_score int,
  p_team_rating numeric, p_opp_team_rating numeric
) returns table(base int, attendance int, score_bonus int, strength_bonus int, total int) ...
```
**Critical:** mirror tier boundaries EXACTLY (the Scoring System Change Checklist in CLAUDE.md governs these). Add a PL/pgSQL parity test in Phase 3 tests that feeds the same inputs as `rating.test.ts` and asserts equal totals.

Also create a reusable internal procedure used by record-result and update-players:
```sql
-- recomputes & writes player_match_results rows for ONE completed match
-- (points only; rating_* left null until session end)
create or replace function _write_match_results(p_match_id uuid) returns void ...
```
`_write_match_results` reads the match's teams (winner flag), participants, current player ratings, and first score set; computes per-player points via `_match_points`; deletes existing `player_match_results` for the match; inserts fresh rows. This single helper backs both `record_result` and `update_match_players`.

## RPCs to Create (migration `20260625000013_complex_match_rpcs.sql`)

| RPC | Replaces | Params | Returns |
|-----|----------|--------|---------|
| `update_match(p_id, p_match_type, p_played_at, p_winner_team, p_scores jsonb)` | `useUpdateMatch` | — | void |
| `update_match_players(p_id, p_team_a jsonb, p_team_b jsonb)` | `useUpdateMatchPlayers` | player id arrays | void |
| `record_result(p_id, p_winner_team, p_scores jsonb)` | `useRecordResult` | — | void |
| `end_match_no_winner(p_id, p_scores jsonb)` | `useEndMatchNoWinner` | — | void |

### `update_match`
UPDATE match (type, played_at) → set team winner flags → replace scores. No points recompute today (it only edits metadata + winner flag + scores; points come from record_result). **Preserve: `useUpdateMatch` does NOT touch `player_match_results`.** Keep that exactly.

### `record_result`
```text
1. update matches status=COMPLETED, ended_at=now()
2. set TEAM_A/TEAM_B is_winner from p_winner_team
3. replace match_scores (delete, insert rows where a>0 or b>0)
4. perform _write_match_results(p_id)   -- points only
5. perform refresh_player_session_stats(session_id); refresh_player_all_time_stats()
```
`_write_match_results` uses UPSERT semantics today (`onConflict player_id,match_id`); implement as delete-then-insert inside the helper for simplicity (same end state).

### `update_match_players`
```text
1. assert no duplicate player across both teams (raise 'duplicate_player')
2. delete + reinsert match_participants for the two teams
3. perform _write_match_results(p_id)  -- only writes rows if match COMPLETED & has winner & score; helper guards internally
4. refresh_player_session_stats(session_id); refresh_player_all_time_stats()
```
Move the "only recompute when COMPLETED + winner + score" guard into `_write_match_results` (early-return / delete-only when not completed).

### `end_match_no_winner`
```text
1. update matches status=COMPLETED, ended_at=now()
2. set all teams is_winner=false
3. delete player_match_results for match
4. replace match_scores
5. refresh_player_session_stats(session_id); refresh_player_all_time_stats()
```

## Hook Changes
Replace each `mutationFn` body with one `supabase.rpc(...)` call passing the same inputs (`scores` → jsonb, player arrays → jsonb). Remove TS imports of `calculateMatchPoints`/`teamAvgRating`/`SCORING_CONFIG` from `useMatches.ts` once these four hooks no longer use them. Keep `onSuccess` invalidations.

## Related Code Files
- Modify: `src/hooks/useMatches.ts` (4 mutations).
- Create: `20260625000012_rating_helpers.sql`, `20260625000013_complex_match_rpcs.sql`.
- Add test: `src/lib/__tests__/plpgsql-points-parity` (or a SQL fixture) — verify DB `_match_points` matches `rating.test.ts` cases.

## Implementation Steps
1. Read `rating.ts` + `rating.test.ts` to capture exact tier boundaries and expected values.
2. Write `20260625000012_rating_helpers.sql` (`_team_avg_rating`, `_match_points`, `_write_match_results`); apply.
3. Verify `_match_points` parity against `rating.test.ts` cases in SQL editor.
4. Write `20260625000013_complex_match_rpcs.sql`; apply.
5. Update `useRecordResult`, `useUpdateMatch`, `useUpdateMatchPlayers`, `useEndMatchNoWinner`.
6. `npm run build && npm run test`.

## Todo List
- [ ] `rating.ts` boundaries captured
- [ ] `20260625000012_rating_helpers.sql` applied + parity-checked
- [ ] `20260625000013_complex_match_rpcs.sql` applied
- [ ] `useRecordResult` on `record_result`
- [ ] `useUpdateMatch` on `update_match`
- [ ] `useUpdateMatchPlayers` on `update_match_players`
- [ ] `useEndMatchNoWinner` on `end_match_no_winner`
- [ ] points-parity test added + green
- [ ] build + tests green

## Success Criteria
- After `record_result`, `player_match_results` rows match the TS-computed values byte-for-byte (same base/attendance/score/strength/total).
- `update_match_players` recomputes points only for completed+winner matches.
- No-winner end clears results and keeps scores.
- `rating.ts` points logic now has a verified PL/pgSQL twin.

## Risk Assessment
- **Tier-boundary drift between TS and PL/pgSQL** = silent scoring bug. Mitigate: parity test (mandatory) + add PL/pgSQL helpers to the Scoring System Change Checklist in CLAUDE.md.
- **Rounding**: TS uses `Math.round` for nothing in points (integers), but `teamAvgRating` is float avg → ensure PL/pgSQL uses `numeric`/`float8` not integer division.

## Security Considerations
- `update_match`/`record_result`/`update_match_players` require authenticated (today's `getUser` guard). Match-edit RLS = `012_authenticated_match_edits.sql` — replicate (`auth.uid() is not null`).

## Next Steps
- Phase 4 reuses `_team_avg_rating`, `_match_points` and adds Elo helpers for session-end.

## Unresolved Questions
- Should the PL/pgSQL helpers be added to CLAUDE.md's "Scoring System Change Checklist"? Strongly recommend yes (request docs-manager update).
