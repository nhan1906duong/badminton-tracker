# Phase 4 — Batch `reorder_queue` + Optimize Session Rating Loops

## Context Links
- Overview: [plan.md](./plan.md)
- Migrations to patch:
  - `supabase/migrations/20260625000008_match-lifecycle-rpcs.sql` (`reorder_queue`)
  - `supabase/migrations/20260625000011_session-rating-rpcs.sql` (`end_session`, `recalculate_all_ratings`)

## Overview
- **Priority:** P2 — correctness of existing behavior plus moderate performance improvement.
- **Status:** pending
- Two query-level inefficiencies remain after the earlier phases:
  1. **`reorder_queue`** issues one `UPDATE` per match in a PL/pgSQL loop — N round trips when a single batched `UPDATE ... FROM` would do.
  2. **`end_session` / `recalculate_all_ratings`** use correlated scalar subqueries inside a `FOR` loop to fetch team IDs and winner — avoidable with a single pre-query JOIN.

## Key Insights

### `reorder_queue`
- Current code: `FOR v_elem IN SELECT * FROM jsonb_array_elements(p_updates) LOOP UPDATE matches SET queue_position = ... WHERE id = ...; END LOOP;`
- Every iteration is a separate plan + execute inside Postgres. Even with PK index lookup, PL/pgSQL loop overhead adds up for large queues.
- Single-statement `UPDATE ... FROM (SELECT ... FROM jsonb_array_elements(...)) u WHERE matches.id = u.id` executes as one plan, one lock acquisition, one WAL flush.

### `end_session` correlated subqueries
Current inner query in `FOR v_match IN`:
```sql
(SELECT id FROM match_teams WHERE match_id = m.id AND team_label = 'TEAM_A') AS team_a_id,
(SELECT id FROM match_teams WHERE match_id = m.id AND team_label = 'TEAM_B') AS team_b_id,
(SELECT team_label FROM match_teams WHERE match_id = m.id AND is_winner = true) AS winner_team
```
Three correlated subqueries per match. With `idx_match_teams_match_id` these are fast index lookups, but they can be consolidated into a single JOIN that fetches all matches + team IDs + winner in one pass before the loop starts.

Better pattern: build a `temp table _matches` from a single JOIN before the loop, then `FOR v_match IN SELECT * FROM _matches ORDER BY played_at`:
```sql
CREATE TEMP TABLE _matches ON COMMIT DROP AS
SELECT
  m.id AS match_id,
  m.played_at,
  ta.id AS team_a_id,
  tb.id AS team_b_id,
  tw.team_label AS winner_team
FROM matches m
JOIN match_teams ta ON ta.match_id = m.id AND ta.team_label = 'TEAM_A'
JOIN match_teams tb ON tb.match_id = m.id AND tb.team_label = 'TEAM_B'
LEFT JOIN match_teams tw ON tw.match_id = m.id AND tw.is_winner = true
WHERE m.session_id = p_id AND m.status = 'COMPLETED';
```

### `recalculate_all_ratings`
Same correlated subquery pattern nested inside a double loop (sessions × matches). Same JOIN-based pre-query fix applies to the inner match query, scoped per session.

## Related Code Files
- Modify via new migration: `reorder_queue`, `end_session`, `recalculate_all_ratings`
- Create: `supabase/migrations/20260630000004_batch-updates-and-query-optimization.sql`
- No hook or component changes.

## Implementation Steps

### `reorder_queue`
1. Replace the `FOR` loop with a single `UPDATE ... FROM`:
```sql
UPDATE matches m
SET queue_position = u.pos
FROM (
  SELECT
    (elem->>'id')::uuid           AS id,
    (elem->>'queue_position')::int AS pos
  FROM jsonb_array_elements(p_updates) AS elem
) u
WHERE m.id = u.id;
```

### `end_session` — pre-fetch matches
1. Add a `CREATE TEMP TABLE _matches ON COMMIT DROP AS SELECT ...` before the `FOR` loop.
2. Change `FOR v_match IN SELECT ... FROM matches ...` to `FOR v_match IN SELECT * FROM _matches ORDER BY played_at ASC`.
3. Remove the three correlated subqueries from the inner SELECT; reference `v_match.team_a_id`, `v_match.team_b_id`, `v_match.winner_team` directly.

### `recalculate_all_ratings` — per-session pre-fetch
1. Inside the outer `FOR v_session IN ...` loop, add a `CREATE TEMP TABLE _sess_matches ON COMMIT DROP AS SELECT ...` using the same JOIN pattern, scoped to `m.session_id = v_session.id`.
2. Change the inner match loop to `FOR v_match IN SELECT * FROM _sess_matches ORDER BY played_at ASC`.
3. `DROP TABLE _sess_matches` at the end of each session iteration (or use `ON COMMIT DROP` on a `BEGIN`/`SAVEPOINT`). Simpler: use a regular CTE pre-computed into a temp table before each iteration.

## Migration Skeleton

```sql
-- Phase 4: Batch reorder_queue + optimize end_session / recalculate_all_ratings.

-- 1. reorder_queue — replace per-row loop with single batch UPDATE
CREATE OR REPLACE FUNCTION reorder_queue(p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE matches m
  SET queue_position = u.pos
  FROM (
    SELECT
      (elem->>'id')::uuid            AS id,
      (elem->>'queue_position')::int  AS pos
    FROM jsonb_array_elements(p_updates) AS elem
  ) u
  WHERE m.id = u.id;
END;
$$;

GRANT EXECUTE ON FUNCTION reorder_queue(jsonb) TO authenticated;


-- 2. end_session — pre-fetch all match/team data before the loop
CREATE OR REPLACE FUNCTION end_session(p_id uuid)
RETURNS SETOF sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match        record;
  v_team_a_rating numeric;
  v_team_b_rating numeric;
  v_expected_a   numeric;
  v_delta_a      int;
  v_delta_b      int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Running ratings from current player ratings for participants in this session
  CREATE TEMP TABLE _ratings ON COMMIT DROP AS
  SELECT DISTINCT mp.player_id,
    COALESCE(pl.rating, 1000)::numeric AS rating
  FROM matches m
  JOIN match_participants mp ON mp.match_id = m.id
  JOIN players pl ON pl.id = mp.player_id
  WHERE m.session_id = p_id AND m.status = 'COMPLETED';

  -- Pre-fetch all completed matches + team IDs + winner in one JOIN
  CREATE TEMP TABLE _matches ON COMMIT DROP AS
  SELECT
    m.id        AS match_id,
    m.played_at,
    ta.id       AS team_a_id,
    tb.id       AS team_b_id,
    tw.team_label AS winner_team
  FROM matches m
  JOIN match_teams ta ON ta.match_id = m.id AND ta.team_label = 'TEAM_A'
  JOIN match_teams tb ON tb.match_id = m.id AND tb.team_label = 'TEAM_B'
  LEFT JOIN match_teams tw ON tw.match_id = m.id AND tw.is_winner = true
  WHERE m.session_id = p_id AND m.status = 'COMPLETED';

  FOR v_match IN SELECT * FROM _matches ORDER BY played_at ASC LOOP
    IF v_match.winner_team IS NULL THEN CONTINUE; END IF;

    SELECT COALESCE(AVG(r.rating), 1000) INTO v_team_a_rating
    FROM match_participants mp
    JOIN _ratings r ON r.player_id = mp.player_id
    WHERE mp.match_id = v_match.match_id AND mp.team_id = v_match.team_a_id;

    SELECT COALESCE(AVG(r.rating), 1000) INTO v_team_b_rating
    FROM match_participants mp
    JOIN _ratings r ON r.player_id = mp.player_id
    WHERE mp.match_id = v_match.match_id AND mp.team_id = v_match.team_b_id;

    v_expected_a := _expected_win_rate(v_team_a_rating, v_team_b_rating);
    v_delta_a := _rating_delta(v_expected_a, CASE WHEN v_match.winner_team = 'TEAM_A' THEN 1.0 ELSE 0.0 END);
    v_delta_b := _rating_delta(1.0 - v_expected_a, CASE WHEN v_match.winner_team = 'TEAM_B' THEN 1.0 ELSE 0.0 END);

    UPDATE player_match_results pmr
    SET
      rating_before = r.rating,
      rating_after  = r.rating + CASE WHEN mp.team_id = v_match.team_a_id THEN v_delta_a ELSE v_delta_b END,
      rating_delta  = CASE WHEN mp.team_id = v_match.team_a_id THEN v_delta_a ELSE v_delta_b END
    FROM match_participants mp
    JOIN _ratings r ON r.player_id = mp.player_id
    WHERE pmr.player_id = mp.player_id
      AND pmr.match_id = v_match.match_id
      AND mp.match_id = v_match.match_id;

    UPDATE _ratings SET rating = rating + v_delta_a
    WHERE player_id IN (
      SELECT player_id FROM match_participants
      WHERE match_id = v_match.match_id AND team_id = v_match.team_a_id
    );

    UPDATE _ratings SET rating = rating + v_delta_b
    WHERE player_id IN (
      SELECT player_id FROM match_participants
      WHERE match_id = v_match.match_id AND team_id = v_match.team_b_id
    );
  END LOOP;

  UPDATE players p SET rating = r.rating FROM _ratings r WHERE p.id = r.player_id;
  UPDATE sessions SET ended_at = now() WHERE id = p_id;

  PERFORM refresh_player_session_stats(p_id);
  PERFORM refresh_player_all_time_stats();

  RETURN QUERY SELECT * FROM sessions WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION end_session(uuid) TO authenticated;

-- Note: recalculate_all_ratings uses the same pre-fetch pattern per session.
-- Full body in migration — skeleton omitted here for brevity; apply same
-- CREATE TEMP TABLE _sess_matches ON COMMIT DROP AS SELECT ... pattern
-- inside the v_session loop, replacing the correlated subqueries in the inner loop.
```

## Todo List
- [ ] Create migration `20260630000004_batch-updates-and-query-optimization.sql`
- [ ] `reorder_queue`: batch UPDATE
- [ ] `end_session`: pre-fetch `_matches` temp table, remove correlated subqueries
- [ ] `recalculate_all_ratings`: same inner-match pre-fetch per session
- [ ] Apply + smoke test: reorder queue in UI, end a session, recalculate ratings
- [ ] `npm run build && npm run test` green

## Success Criteria
- `reorder_queue` executes a single UPDATE statement regardless of queue size.
- `end_session` and `recalculate_all_ratings` have no correlated scalar subqueries inside the match loop.
- All existing behaviors (Elo deltas, session end, queue reorder) produce identical results.
- Tests pass.

## Risk Assessment
- **`reorder_queue` batch UPDATE** — standard pattern; low risk. Edge case: if `p_updates` is empty, `UPDATE ... FROM (empty)` no-ops cleanly.
- **`end_session` temp table** — `ON COMMIT DROP` ensures cleanup even on error/rollback. Ensure the function is always called inside a transaction (it is, by default in Postgres RPC calls from Supabase).
- **`recalculate_all_ratings` inner temp table** — must be explicitly dropped or recreated each session iteration since `ON COMMIT DROP` only fires at transaction end, not loop iteration. Use `DROP TABLE IF EXISTS _sess_matches; CREATE TEMP TABLE _sess_matches ON COMMIT DROP AS ...` at the top of each loop iteration.

## Security Considerations
- No auth or privilege changes. All RPCs retain `SECURITY DEFINER` + `SET search_path = public`.

## Next Steps
- After Phase 4, all four phases complete the Postgres optimization plan.
- Consider a follow-up to tighten `pmr_insert`/`pmr_update` RLS policies (see plan.md Unresolved Questions).
