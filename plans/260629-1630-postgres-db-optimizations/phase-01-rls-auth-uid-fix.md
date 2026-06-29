# Phase 1 — Fix RLS `auth.uid()` Per-Row Anti-Pattern

## Context Links
- Overview: [plan.md](./plan.md)
- Supabase reference: [RLS Performance](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations)
- Migrations to patch: `supabase/migrations/001_initial_schema.sql`, `002_sessions.sql`

## Overview
- **Priority:** P1 — correctness + performance. Worsens with every row added.
- **Status:** pending
- `auth.uid()` in a `USING` or `WITH CHECK` clause is called once **per row scanned**, not once per query. Wrapping it in `(select auth.uid())` causes Postgres to evaluate it once and cache the result across all rows.

## Key Insights

- This affects all RLS policies that compare `auth.uid() = created_by` or embed `auth.uid()` inside `EXISTS(...)` subqueries.
- Impact is proportional to table size. With hundreds of matches and thousands of participants, the planner evaluates these functions for every candidate row before filtering.
- The fix is purely syntactic — zero semantic change. Same users pass, same users fail.
- Policies that already use `USING (true)` (SELECT policies, anon read policies) are unaffected.

## Affected Policies

### `sessions` table (`002_sessions.sql`)

| Policy | Current | Fix |
|--------|---------|-----|
| `sessions_insert_own` | `auth.uid() = created_by` | `(select auth.uid()) = created_by` |
| `sessions_update_own` USING | `auth.uid() = created_by` | `(select auth.uid()) = created_by` |
| `sessions_update_own` WITH CHECK | `auth.uid() = created_by` | `(select auth.uid()) = created_by` |

### `matches` table (`001_initial_schema.sql`)

| Policy | Current | Fix |
|--------|---------|-----|
| `matches_insert_own` WITH CHECK | `auth.uid() = created_by` | `(select auth.uid()) = created_by` |
| `matches_update_own` USING | `auth.uid() = created_by` | `(select auth.uid()) = created_by` |
| `matches_update_own` WITH CHECK | `auth.uid() = created_by` | `(select auth.uid()) = created_by` |
| `matches_delete_own` USING | `auth.uid() = created_by` | `(select auth.uid()) = created_by` |

### `match_teams` table (`001_initial_schema.sql`)

All INSERT/UPDATE/DELETE policies embed `auth.uid()` inside an `EXISTS(SELECT 1 FROM matches m WHERE ... m.created_by = auth.uid())`. Fix: use `m.created_by = (select auth.uid())`.

### `match_participants` table (`001_initial_schema.sql`)

Same EXISTS pattern as `match_teams`. Same fix.

### `match_scores` table (`001_initial_schema.sql`)

Same EXISTS pattern as `match_teams`. Same fix.

## Related Code Files
- Create: `supabase/migrations/20260630000001_fix-rls-auth-uid-per-row.sql`
- No hook or component changes.

## Implementation Steps

1. Create migration `20260630000001_fix-rls-auth-uid-per-row.sql`
2. For each affected table: `DROP POLICY IF EXISTS "<name>" ON <table>;` then `CREATE POLICY` with the corrected `(select auth.uid())` form.
3. Apply migration locally and verify policies in Supabase Dashboard → Authentication → Policies.
4. Run `npm run build && npm run test`.

## Migration Skeleton

```sql
-- Fix: wrap auth.uid() in (select ...) so Postgres evaluates it once per query,
-- not once per row. No semantic change — same users pass/fail.

-- ---- SESSIONS ----
DROP POLICY IF EXISTS "sessions_insert_own" ON sessions;
DROP POLICY IF EXISTS "sessions_update_own" ON sessions;

CREATE POLICY "sessions_insert_own" ON sessions
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "sessions_update_own" ON sessions
  FOR UPDATE TO authenticated
  USING  ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

-- ---- MATCHES ----
DROP POLICY IF EXISTS "matches_insert_own"  ON matches;
DROP POLICY IF EXISTS "matches_update_own"  ON matches;
DROP POLICY IF EXISTS "matches_delete_own"  ON matches;

CREATE POLICY "matches_insert_own" ON matches
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "matches_update_own" ON matches
  FOR UPDATE TO authenticated
  USING  ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "matches_delete_own" ON matches
  FOR DELETE TO authenticated
  USING  ((select auth.uid()) = created_by);

-- ---- MATCH_TEAMS ----
DROP POLICY IF EXISTS "match_teams_insert_own" ON match_teams;
DROP POLICY IF EXISTS "match_teams_update_own" ON match_teams;
DROP POLICY IF EXISTS "match_teams_delete_own" ON match_teams;

CREATE POLICY "match_teams_insert_own" ON match_teams
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_teams.match_id AND m.created_by = (select auth.uid())
  ));

CREATE POLICY "match_teams_update_own" ON match_teams
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_teams.match_id AND m.created_by = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_teams.match_id AND m.created_by = (select auth.uid())
  ));

CREATE POLICY "match_teams_delete_own" ON match_teams
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_teams.match_id AND m.created_by = (select auth.uid())
  ));

-- ---- MATCH_PARTICIPANTS ----
DROP POLICY IF EXISTS "match_participants_insert_own" ON match_participants;
DROP POLICY IF EXISTS "match_participants_update_own" ON match_participants;
DROP POLICY IF EXISTS "match_participants_delete_own" ON match_participants;

CREATE POLICY "match_participants_insert_own" ON match_participants
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_participants.match_id AND m.created_by = (select auth.uid())
  ));

CREATE POLICY "match_participants_update_own" ON match_participants
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_participants.match_id AND m.created_by = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_participants.match_id AND m.created_by = (select auth.uid())
  ));

CREATE POLICY "match_participants_delete_own" ON match_participants
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_participants.match_id AND m.created_by = (select auth.uid())
  ));

-- ---- MATCH_SCORES ----
DROP POLICY IF EXISTS "match_scores_insert_own" ON match_scores;
DROP POLICY IF EXISTS "match_scores_update_own" ON match_scores;
DROP POLICY IF EXISTS "match_scores_delete_own" ON match_scores;

CREATE POLICY "match_scores_insert_own" ON match_scores
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_scores.match_id AND m.created_by = (select auth.uid())
  ));

CREATE POLICY "match_scores_update_own" ON match_scores
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_scores.match_id AND m.created_by = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_scores.match_id AND m.created_by = (select auth.uid())
  ));

CREATE POLICY "match_scores_delete_own" ON match_scores
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_scores.match_id AND m.created_by = (select auth.uid())
  ));
```

## Todo List
- [ ] Create migration `20260630000001_fix-rls-auth-uid-per-row.sql`
- [ ] Apply + verify in Supabase Dashboard
- [ ] `npm run build && npm run test` green

## Success Criteria
- All `INSERT`/`UPDATE`/`DELETE` policies on `sessions`, `matches`, `match_teams`, `match_participants`, `match_scores` use `(select auth.uid())`.
- No existing test regressions.
- Supabase Dashboard shows updated policy definitions.

## Risk Assessment
- **Zero semantic risk** — purely a Postgres evaluation-order hint. The set of rows visible/writable does not change.
- **Migration ordering** — DROP+CREATE is non-transactional for policies; if migration fails mid-way, a policy may be missing. Apply in a single transaction via `BEGIN`/`COMMIT` in the migration file.

## Security Considerations
- No privilege changes. This migration only replaces how `auth.uid()` is evaluated, not what it evaluates to.
