# Phase 2 — Match Lifecycle RPCs

## Context Links
- Overview: [plan.md](./plan.md)
- Hook: `src/hooks/useMatches.ts`
- Round-robin helper (TS): `src/lib/round-robin.ts` (`generateRoundRobin`)

## Overview
- **Priority:** P2 — first real atomicity win (create-match does 4 inserts across 4 tables today).
- **Status:** pending
- Covers match writes that do NOT touch ratings/points: create, start, reopen, delete, league schedule, reorder queue.

## Key Insights
- `useCreateMatch` today: INSERT match → INSERT 2 teams → INSERT participants → optional INSERT scores, with `created_by = auth.uid()`. A failure after the match insert orphans a match row. One RPC fixes this.
- `useCreateLeagueSchedule` is the trickiest: it (a) generates fixtures via TS `generateRoundRobin`, (b) dedupes against existing matches by comparing team rosters. **Decision: keep fixture generation + dedup in TS** (it's pure, already tested, no DB needed) and expose a single `create_league_matches(p_session_id, p_match_type, p_played_at, p_fixtures jsonb)` RPC that inserts the already-computed fixtures atomically. Avoids porting round-robin to PL/pgSQL (YAGNI). The hook computes `p_fixtures` = array of `{ league_round, queue_position, team_a_player_ids[], team_b_player_ids[] }`.
- `useDeleteMatch` deletes child rows in order then refreshes stats RPCs — move the whole sequence + `refresh_*` calls into one RPC. Admin-gated (`admins_delete_matches`).
- `useReorderQueue` does N parallel updates — replace with one `reorder_queue(p_updates jsonb)` doing a single `update ... from (values ...)`.
- `useStartMatch` / `useReopenMatch` are single UPDATEs; reopen also calls `refresh_*`. Fold the refreshes in.

## RPCs to Create (migration `20260625000011_match_lifecycle_rpcs.sql`)

| RPC | Replaces | Params | Returns |
|-----|----------|--------|---------|
| `create_match(p_input jsonb)` | `useCreateMatch` | session_id, match_type, played_at, notes, status, queue_position, league_round, team_a_player_ids[], team_b_player_ids[], winner_team, scores[] | `matches` row |
| `create_league_matches(p_session_id uuid, p_match_type text, p_played_at timestamptz, p_fixtures jsonb)` | `useCreateLeagueSchedule` (insert part) | precomputed fixtures | setof `matches` |
| `start_match(p_id uuid)` | `useStartMatch` | id | void |
| `reopen_match(p_id uuid)` | `useReopenMatch` | id | void (calls refresh_* internally) |
| `delete_match(p_id uuid)` | `useDeleteMatch` | id | void (resolves session_id, deletes children, refresh_*) |
| `reorder_queue(p_updates jsonb)` | `useReorderQueue` | `[{id, queue_position}]` | void |

## Implementation Details

### `create_match`
```text
1. assert auth.uid() not null
2. insert matches (..., created_by = auth.uid()) returning id
3. insert match_teams TEAM_A/TEAM_B with is_winner from p_input->>'winner_team'
4. insert match_participants from team_a_player_ids / team_b_player_ids (join to inserted team ids)
5. insert match_scores for score rows where a>0 or b>0
6. return the matches row
```
Note: Phase 2's `create_match` does NOT write `player_match_results` even when `winner_team`+scores are supplied — this matches today's `useCreateMatch`, which never wrote results (points are written later via `useRecordResult`). Preserve that exactly.

### `create_league_matches`
Iterate `p_fixtures` jsonb array; for each: insert match (`status='SCHEDULED'`, `league_round`, `queue_position`, `created_by=auth.uid()`), 2 teams (`is_winner=false`), participants. Return the inserted matches so the hook keeps its `createdMatches` return. Dedup already done in TS before the call.

### `delete_match`
```text
1. assert is_admin()
2. select session_id into v_sid
3. delete match_scores, match_participants, match_teams, player_match_results, matches (by match id)
4. if v_sid not null: perform refresh_player_session_stats(v_sid)
5. perform refresh_player_all_time_stats()
```
(Note: today's `useDeleteMatch` does NOT delete `player_match_results`; check whether it should — see Unresolved. Recommend adding it for correctness since a deleted match's results are now stale; current code relies on `refresh_player_session_stats` recount which reads from `player_match_results`, so leftover rows could distort stats. **Add the `player_match_results` delete.**)

### `reorder_queue`
```sql
update matches m set queue_position = u.qp
from jsonb_to_recordset(p_updates) as u(id uuid, qp int)
where m.id = u.id;
```

## Hook Changes
- `useCreateMatch`: replace whole body with `supabase.rpc('create_match', { p_input: {...} })`; return `data as Match`.
- `useCreateLeagueSchedule`: keep the existing-match fetch + `generateRoundRobin` + dedup loop in TS, but instead of inserting per-fixture, build `p_fixtures` array and call `create_league_matches` once. Return `data as Match[]`.
- `useStartMatch`/`useReopenMatch`/`useDeleteMatch`/`useReorderQueue`: replace bodies with single rpc call; drop the now-internal `refresh*` helper calls. Keep `onSuccess` invalidations.

## Related Code Files
- Modify: `src/hooks/useMatches.ts` (6 mutations; leave update/record/end-no-winner/update-players for Phase 3). The `refreshSessionStatsForMatch`/`refreshAllTimeStats`/`refreshSessionStatsBySessionId` helpers may stay if still used by Phase-3 hooks; remove once unused.
- Create: `supabase/migrations/20260625000011_match_lifecycle_rpcs.sql`.

## Implementation Steps
1. Write + apply migration.
2. Smoke-test `create_match` and `create_league_matches` in SQL editor (verify teams/participants/scores rows).
3. Update `useCreateMatch`.
4. Update `useCreateLeagueSchedule` (TS dedup retained, single insert RPC).
5. Update `useStartMatch`, `useReopenMatch`, `useDeleteMatch`, `useReorderQueue`.
6. `npm run build && npm run test`.

## Todo List
- [ ] Migration `20260625000011_match_lifecycle_rpcs.sql`
- [ ] `useCreateMatch` on `create_match`
- [ ] `useCreateLeagueSchedule` on `create_league_matches` (TS dedup kept)
- [ ] `useStartMatch` / `useReopenMatch` on RPCs
- [ ] `useDeleteMatch` on `delete_match` (+ pmr delete decision)
- [ ] `useReorderQueue` on `reorder_queue`
- [ ] build + tests green

## Success Criteria
- Creating a match (live/scheduled/queued) and a league schedule produces identical rows to before.
- Delete-match still admin-gated; stats refresh after.
- Queue reorder persists in one round-trip.

## Risk Assessment
- **Participant→team mapping** inside `create_match` must map player ids to the correct inserted team id. Mitigate: insert teams `returning id, team_label` into a CTE, then insert participants joining on label.
- **League dedup divergence**: keeping dedup in TS means RPC trusts caller; double-submit could duplicate. Mitigate: dedup logic unchanged from today, same risk profile as current code.

## Security Considerations
- `create_match`/`create_league_matches` require `auth.uid()` (today's `Not authenticated` guard). `delete_match` requires `is_admin()`.

## Next Steps
- Phase 3 reuses the team/participant insert pattern and adds points writes.

## Unresolved Questions
- Should `delete_match` also delete `player_match_results` (today's hook does not, relies on recount)? Plan recommends yes.
- Confirm anon vs authenticated grant for `create_match` (today gated by `auth.uid()` in JS, table RLS may also restrict).
