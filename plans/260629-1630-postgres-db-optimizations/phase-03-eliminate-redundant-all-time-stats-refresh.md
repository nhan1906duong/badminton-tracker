# Phase 3 — Eliminate Redundant `refresh_player_all_time_stats` Calls

## Context Links
- Overview: [plan.md](./plan.md)
- Migrations to patch:
  - `supabase/migrations/20260625000010_complex-match-state-rpcs.sql`
  - `supabase/migrations/20260625000008_match-lifecycle-rpcs.sql`
- Stats table: `supabase/migrations/20260625000003_player_all_time_stats_table.sql`

## Overview
- **Priority:** P1 — highest runtime impact. Fires on every match result during play.
- **Status:** pending
- `refresh_player_all_time_stats()` aggregates `player_match_results` for **ended sessions only**. During a live session, no new data appears in ended sessions, so every call during active play is a full no-op scan of the `player_match_results` table.

## Key Insights

- `refresh_player_all_time_stats()` does a full CTE scan of `player_match_results WHERE session_id IN (SELECT id FROM sessions WHERE ended_at IS NOT NULL)`. With hundreds of matches across many sessions, this scans a large result set on every call.
- The function is currently called from: `record_result`, `end_match_no_winner`, `update_match_players`, `reopen_match`, `delete_match`, `delete_session`, `end_session`, `recalculate_all_ratings`.
- The first four (`record_result`, `end_match_no_winner`, `update_match_players`, `reopen_match`) all operate on matches **within a live session**. Live sessions have `ended_at IS NULL`, so they are excluded from the all-time stats CTE. The refresh produces zero change in `player_all_time_stats` but still pays the full query cost.
- `delete_match` is the edge case: a match could be deleted from an **ended** session, which would affect all-time stats. Keep the call there.
- The last three (`delete_session`, `end_session`, `recalculate_all_ratings`) operate on ended sessions or end a session — keep the call in all of them.

## Calls to Remove vs. Keep

| RPC | Currently calls `refresh_player_all_time_stats`? | Action | Why |
|-----|--------------------------------------------------|--------|-----|
| `record_result` | ✅ Yes | **Remove** | Operates on live-session match — ended sessions unchanged |
| `end_match_no_winner` | ✅ Yes | **Remove** | Same — live session |
| `update_match_players` | ✅ Yes | **Remove** | Same — live session |
| `reopen_match` | ✅ Yes | **Remove** | Transitions COMPLETED→LIVE within a session; only affects session stats |
| `delete_match` | ✅ Yes | **Keep** | Admin can delete a match in an ended session → all-time stats change |
| `end_session` | ✅ Yes | **Keep** | Session transitions to ended — all-time stats change |
| `delete_session` | ✅ Yes | **Keep** | Removes ended session data — all-time stats change |
| `recalculate_all_ratings` | ✅ Yes | **Keep** | Full replay — all sessions change |

## Related Code Files
- Modify via new migration: the 4 RPCs above (`record_result`, `end_match_no_winner`, `update_match_players`, `reopen_match`) — `CREATE OR REPLACE` them without the `refresh_player_all_time_stats` call.
- Create: `supabase/migrations/20260630000003_remove-redundant-all-time-stats-refresh.sql`
- No hook or component changes.

## Implementation Steps

1. Create migration `20260630000003_remove-redundant-all-time-stats-refresh.sql`.
2. `CREATE OR REPLACE` each of the 4 RPCs, identical to their current definitions except removing the `perform refresh_player_all_time_stats();` line.
3. Apply migration locally.
4. Smoke test: record a match result → session stats update, leaderboard unchanged → end the session → leaderboard updates. Verify `player_all_time_stats.updated_at` only changes after `end_session`.
5. `npm run build && npm run test`.

## Migration Skeleton

```sql
-- Remove perform refresh_player_all_time_stats() from RPCs that operate exclusively
-- on live sessions. All-time stats aggregate only ended sessions, so these calls
-- produced zero change in player_all_time_stats but paid the full scan cost.
-- The call is preserved in: end_session, delete_session, delete_match, recalculate_all_ratings.

-- record_result: same as 20260625000010 except removes the all-time refresh
CREATE OR REPLACE FUNCTION record_result(
  p_id          uuid,
  p_winner_team text,
  p_scores      jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- ... (full body identical to current except last line removed)
  -- Refresh materialized stats
  perform refresh_player_session_stats(v_session_id);
  -- perform refresh_player_all_time_stats();  ← REMOVED
$$;

-- end_match_no_winner: same, remove all-time refresh
CREATE OR REPLACE FUNCTION end_match_no_winner(p_id uuid, p_scores jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  -- ... same body, remove perform refresh_player_all_time_stats()
$$;

-- update_match_players: same, remove all-time refresh
CREATE OR REPLACE FUNCTION update_match_players(
  p_id uuid, p_team_a_player_ids uuid[], p_team_b_player_ids uuid[]
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  -- ... same body, remove perform refresh_player_all_time_stats()
$$;

-- reopen_match: same, remove all-time refresh
CREATE OR REPLACE FUNCTION reopen_match(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  -- ... same body, remove perform refresh_player_all_time_stats()
$$;
```

Note: write the full function bodies in the migration (copy from the existing migrations), not just stubs.

## Todo List
- [ ] Create migration `20260630000003_remove-redundant-all-time-stats-refresh.sql` with full bodies
- [ ] Apply + verify — `player_all_time_stats.updated_at` does NOT change after `record_result`
- [ ] Verify `player_all_time_stats.updated_at` DOES change after `end_session`
- [ ] `npm run build && npm run test` green

## Success Criteria
- `perform refresh_player_all_time_stats()` is absent from `record_result`, `end_match_no_winner`, `update_match_players`, `reopen_match`.
- All-time leaderboard still updates correctly after a session ends.
- Session leaderboard still updates after every match result (unchanged — `refresh_player_session_stats` stays).

## Risk Assessment
- **All-time stats stale during live session** — this is the intended behavior; they only reflect ended sessions anyway. No data visible to the user changes.
- **`delete_match` on ended-session match** — call is preserved; all-time stats still refresh in this case.
- The biggest risk is forgetting to include the full function body in the migration and accidentally truncating a function. Always copy the full definition.

## Security Considerations
- No auth or privilege changes.
