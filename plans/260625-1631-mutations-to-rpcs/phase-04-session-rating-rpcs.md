# Phase 4 — Session Management + Rating RPCs (Elo in PL/pgSQL)

## Context Links
- Overview: [plan.md](./plan.md)
- Hook: `src/hooks/useSessions.ts` (`useEndSession`, `useDeleteSession`, `useClearAllData`, `useRecalculateAllRatings`)
- Elo algorithm (TS, to port): `src/lib/rating.ts` (`calculateExpectedWinRate`, `calculateRatingDelta`, `teamAvgRating`, `calculateMatchPoints`, `SCORING_CONFIG`)
- Reuses Phase 3 helpers: `_team_avg_rating`, `_match_points`
- Scoring spec: `docs/specs/player_rating_and_point_system_spec.md`

## Overview
- **Priority:** P2 — biggest atomicity + latency win and the only phase porting Elo. `useEndSession`/`useRecalculate` today do O(matches) sequential round-trips and span many tables non-atomically.
- **Status:** pending
- **Depends on Phase 3** (Elo helpers extend the Phase 3 points helpers).

## Key Insights — Elo algorithm to port
From `rating.ts`:
- `calculateExpectedWinRate(a, b) = 1 / (1 + 10^((b - a)/400))`
- `calculateRatingDelta(expected, actual, k=32) = round(k * (actual - expected))`
- Session-end loop (`useEndSession`): for each COMPLETED match in `played_at ASC` order with a winner:
  - `teamARating = avg(running ratings of team A)`, same for B.
  - `expectedA = expectedWinRate(teamARating, teamBRating)`; `deltaA = ratingDelta(expectedA, isAwinner?1:0)`; `deltaB = ratingDelta(1-expectedA, isAwinner?0:1)`.
  - Apply deltas to the **running** rating map (so later matches in the session use updated ratings).
  - Record `rating_before/after/delta` into that match's `player_match_results` rows.
- Final running ratings persist to `players.rating`.
- **Ordering is load-bearing** — ratings compound match-by-match within the session. PL/pgSQL must loop in `played_at ASC` order (a cursor/`for ... in select ... order by played_at`), not a set-based update.

## New PL/pgSQL Elo helpers (extend `20260625000012_rating_helpers.sql` or new `..._elo_helpers.sql`)
```sql
create or replace function _expected_win_rate(a numeric, b numeric) returns numeric  -- 1/(1+pow(10,(b-a)/400))
create or replace function _rating_delta(expected numeric, actual int, k int default 32) returns int  -- round(k*(actual-expected))
```

## RPCs to Create (migration `20260625000014_session_rating_rpcs.sql`)

| RPC | Replaces | Params | Returns |
|-----|----------|--------|---------|
| `end_session(p_id uuid)` | `useEndSession` | id | `sessions` row |
| `delete_session(p_id uuid)` | `useDeleteSession` | id | void |
| `clear_all_data()` | `useClearAllData` (DB part) | — | void |
| `recalculate_all_ratings()` | `useRecalculateAllRatings` | — | void |

### `end_session` — core algorithm (cursor loop)
```text
1. assert auth.uid() not null
2. build temp running-rating map: select id, coalesce(rating,1000) for all players in this session's completed matches
   (use a temp table or a plpgsql map via hstore/jsonb; simplest: temp table _rr(player_id uuid pk, rating numeric))
3. for match in (select ... from matches join teams/participants where session_id=p_id and status='COMPLETED' order by played_at asc):
     - skip if no winner
     - compute teamARating/teamBRating from _rr via _team_avg_rating(array_agg(rating))
     - expectedA = _expected_win_rate(teamARating, teamBRating)
     - deltaA = _rating_delta(expectedA, isAwinner?1:0); deltaB = _rating_delta(1-expectedA, isAwinner?0:1)
     - update player_match_results set rating_before, rating_after, rating_delta for this match's players
     - update _rr running ratings
4. update players p set rating = rr.rating from _rr where p.id = rr.player_id
5. update sessions set ended_at=now() where id=p_id returning row
6. perform refresh_player_session_stats(p_id); refresh_player_all_time_stats()
7. return sessions row
```
Implementation detail: a per-match nested loop over teams/participants. Cleanest in PL/pgSQL is a temp table `_rr` (created `on commit drop`) for the running map, plus per-match subqueries. Avoid set-based — the running compounding requires sequential iteration.

### `delete_session`
```text
1. assert is_admin()
2. collect match ids for session
3. delete match_scores, match_participants, match_teams, player_match_results (by match ids), matches (by ids)
4. delete sessions row (player_session_stats cascade)
5. perform refresh_player_all_time_stats()
```

### `recalculate_all_ratings`
Port the full replay from `useRecalculateAllRatings`:
```text
1. assert is_admin()  (today gated only by being signed in via UI; recommend admin — see Unresolved)
2. reset all players.rating = 1000
3. delete all player_match_results
4. running map _rr seeded at 1000 for all players
5. for session in (select id, ended_at from sessions order by started_at asc):
     v_ended := ended_at is not null
     for match in (completed matches order by played_at asc):
       compute team ratings from _rr
       points via _match_points (always)
       if v_ended: deltas via _expected_win_rate/_rating_delta, write rating_before/after/delta, advance _rr
       else: rating_* = null, do NOT advance _rr
       insert player_match_results rows
6. persist _rr -> players.rating
7. for each session: refresh_player_session_stats(id); then refresh_player_all_time_stats()
```
This is the most code but it's a faithful translation of the existing TS loop. The `played_at ASC` within-session ordering and the open-vs-ended branch must match exactly.

### `clear_all_data`
DB-side deletes + resets only (storage stays client-side):
```text
1. assert auth.uid() not null
2. delete match_scores, match_participants, match_teams, player_match_results,
        league_team_players, league_teams, matches, sessions (all rows)
3. update players set avatar_url=null, rating=1000
4. delete players
5. update profiles set avatar_url=null
```
Hook keeps the storage `list`/`remove` calls in TS, then calls `clear_all_data()` for the DB part.

## Hook Changes
- `useEndSession`: replace entire body with `supabase.rpc('end_session', { p_id: id })`; return `data as Session`. Keep all the `setQueryData`/`invalidate` calls in `onSuccess`. **Major LOC reduction.**
- `useRecalculateAllRatings`: replace body with `supabase.rpc('recalculate_all_ratings')`. Keep invalidations.
- `useDeleteSession`: replace body with `supabase.rpc('delete_session', { p_id: id })`.
- `useClearAllData`: keep storage cleanup TS, then `supabase.rpc('clear_all_data')`.
- Remove now-unused `rating.ts` imports from `useSessions.ts`.

## Related Code Files
- Modify: `src/hooks/useSessions.ts` (4 mutations).
- Create: `20260625000014_session_rating_rpcs.sql` (+ Elo helpers if separate).
- Add test: end-session Elo parity — run the same fixture through TS `useEndSession` logic and the RPC, assert identical `players.rating` and `rating_delta` values.

## Implementation Steps
1. Confirm Phase 3 helpers (`_team_avg_rating`, `_match_points`) exist.
2. Add `_expected_win_rate`, `_rating_delta` helpers; apply.
3. Write `end_session` with temp-table running map; apply.
4. Write `delete_session`, `clear_all_data`, `recalculate_all_ratings`; apply.
5. Elo parity check: pick a real session, snapshot expected ratings via current TS path on a copy, run RPC, diff.
6. Update the 4 hooks.
7. `npm run build && npm run test`.

## Todo List
- [ ] Elo helpers `_expected_win_rate` / `_rating_delta` applied
- [ ] `end_session` RPC (cursor loop, running map) applied + Elo-parity verified
- [ ] `delete_session` RPC (admin) applied
- [ ] `clear_all_data` RPC applied
- [ ] `recalculate_all_ratings` RPC applied + parity verified
- [ ] `useEndSession` on RPC
- [ ] `useDeleteSession` on RPC
- [ ] `useClearAllData` on RPC (storage stays TS)
- [ ] `useRecalculateAllRatings` on RPC
- [ ] Elo parity test green
- [ ] build + tests green

## Success Criteria
- `end_session` produces identical `players.rating` and per-match `rating_before/after/delta` vs. the old TS path on the same data.
- `recalculate_all_ratings` reproduces ratings identically (ended sessions commit Elo, open sessions store points only with null rating columns).
- Session/match/data deletes still admin-gated and refresh stats.
- One round-trip per operation (vs. O(matches) today).

## Risk Assessment
- **Elo divergence** is the top risk (compounding + rounding + ordering). Mitigate: mandatory parity test against current TS output before flipping hooks; keep old hook code in git history for rollback.
- **`round()` semantics**: PG `round(numeric)` is half-away-from-zero; JS `Math.round` is half-up (toward +∞). For negative half-values (e.g. -1.5) they differ (PG → -2, JS → -1). Elo deltas can be negative. Mitigate: replicate JS `Math.round` with `floor(x + 0.5)` in `_rating_delta`, NOT `round()`.
- **Long transaction** for `recalculate_all_ratings` over all history — acceptable (admin-only, infrequent), still far faster than N round-trips.

## Security Considerations
- `end_session` requires authenticated (session owner today via UI). `delete_session` requires `is_admin()`. `recalculate_all_ratings` / `clear_all_data` are destructive — gate on `is_admin()` (clear-all today only checks signed-in; recommend tightening to admin — confirm).

## Next Steps
- After Phase 4, all rating logic lives in PL/pgSQL; update CLAUDE.md Scoring Checklist + spec doc (docs-manager).

## Consolidated Unresolved Questions (all phases)
1. `_rating_delta` rounding: confirm `floor(x+0.5)` (JS parity) vs PG `round()` — plan mandates `floor(x+0.5)`.
2. Should `recalculate_all_ratings` and `clear_all_data` be tightened to `is_admin()` (today: any signed-in user via UI)? Plan recommends admin-gate.
3. `delete_match` (Phase 2) — also delete `player_match_results`? Plan recommends yes.
4. Avatar row writes (Phase 1) — RPC or leave direct? Plan recommends leave direct.
5. Confirm `anon` vs `authenticated` execute grants per RPC match each table's current RLS grant audience (Phase 1–5).
6. After porting, update CLAUDE.md "Scoring System Change Checklist" to list the PL/pgSQL helpers as a required edit site.
