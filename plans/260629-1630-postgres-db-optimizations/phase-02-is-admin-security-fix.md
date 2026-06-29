# Phase 2 — Harden `is_admin()` + Fix Per-Row Policy Calls

## Context Links
- Overview: [plan.md](./plan.md)
- Phase 1: [phase-01-rls-auth-uid-fix.md](./phase-01-rls-auth-uid-fix.md)
- Migration to patch: `supabase/migrations/008_role.sql`
- Supabase reference: [SECURITY DEFINER safety](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker)

## Overview
- **Priority:** P1 — security gap + performance.
- **Status:** pending
- Two distinct issues with `is_admin()`:
  1. **Missing `SET search_path`** — `SECURITY DEFINER` functions run with creator privileges. Without a fixed `search_path`, a malicious schema can shadow `public.profiles` and hijack the admin check.
  2. **Per-row evaluation in DELETE policies** — `USING (is_admin())` calls the function once per row evaluated, not once per query. The result is deterministic for a given user (admin or not), so it should be cached.

## Key Insights

- Fixing `SET search_path = ''` also requires qualifying table names as `public.profiles` inside the function body (already done) — confirm no unqualified names were added.
- Wrapping in `(select is_admin())` in DELETE policies follows the same caching principle as `(select auth.uid())` in Phase 1. For admin deletes of 1 row at a time this is minor, but `clear_all_data` triggers these policies in bulk.
- The internal `auth.uid()` call inside `is_admin()` is a `LANGUAGE sql` function — `auth.uid()` is evaluated once per function call already (not per-row within the function). The per-row issue is at the policy level, not inside the function.

## Changes Required

### 1. Recreate `is_admin()` with `SET search_path = ''`

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''            -- ← prevents search_path hijacking
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;
```

Note: also wrapped `auth.uid()` in `(SELECT ...)` inside the function body for consistency and minor performance.

### 2. Recreate DELETE Policies Using `(select is_admin())`

Three policies added by `008_role.sql`:

```sql
-- sessions
DROP POLICY IF EXISTS "admins_delete_sessions" ON sessions;
CREATE POLICY "admins_delete_sessions" ON sessions
  FOR DELETE USING ((select is_admin()));

-- matches
DROP POLICY IF EXISTS "admins_delete_matches" ON matches;
CREATE POLICY "admins_delete_matches" ON matches
  FOR DELETE USING ((select is_admin()));

-- players
DROP POLICY IF EXISTS "admins_delete_players" ON players;
CREATE POLICY "admins_delete_players" ON players
  FOR DELETE USING ((select is_admin()));
```

## Related Code Files
- Create: `supabase/migrations/20260630000002_fix-is-admin-security-and-perf.sql`
- No hook or component changes.

## Implementation Steps

1. Create migration `20260630000002_fix-is-admin-security-and-perf.sql`.
2. `CREATE OR REPLACE FUNCTION is_admin()` with `SET search_path = ''`.
3. DROP + CREATE the three DELETE policies with `(select is_admin())`.
4. Apply migration locally.
5. Test: log in as non-admin, attempt to delete a session/match/player — must fail. Log in as admin — must succeed.
6. `npm run build && npm run test`.

## Migration

```sql
-- Harden is_admin(): fix missing SET search_path on SECURITY DEFINER function,
-- and cache the result across rows in DELETE policies.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

-- Recreate DELETE policies so is_admin() is evaluated once per query, not per row.
DROP POLICY IF EXISTS "admins_delete_sessions" ON sessions;
DROP POLICY IF EXISTS "admins_delete_matches"  ON matches;
DROP POLICY IF EXISTS "admins_delete_players"  ON players;

CREATE POLICY "admins_delete_sessions" ON sessions
  FOR DELETE USING ((select is_admin()));

CREATE POLICY "admins_delete_matches" ON matches
  FOR DELETE USING ((select is_admin()));

CREATE POLICY "admins_delete_players" ON players
  FOR DELETE USING ((select is_admin()));
```

## Todo List
- [ ] Create migration `20260630000002_fix-is-admin-security-and-perf.sql`
- [ ] Apply + verify in Supabase Dashboard
- [ ] Manual test: non-admin delete → rejected, admin delete → allowed
- [ ] `npm run build && npm run test` green

## Success Criteria
- `is_admin()` has `SET search_path = ''` in its definition.
- All three DELETE policies use `(select is_admin())`.
- Admin/non-admin delete behavior unchanged.

## Risk Assessment
- **`SET search_path = ''`** — requires all table references inside the function to be schema-qualified. Already `public.profiles` — no unqualified names exist. Zero runtime risk.
- **Policy DROP+CREATE** — same DROP+CREATE risk as Phase 1. Apply atomically.

## Security Considerations
- `SET search_path = ''` is the recommended hardening for all `SECURITY DEFINER` functions in Postgres. Without it, a `CREATE SCHEMA attacker; CREATE VIEW attacker.profiles AS SELECT ...` could fool the function into returning `true` for any user.
- The RPCs (`delete_player`, `delete_match`, `delete_session`) also have inline `is_admin()` checks — those are not policy-level and are unaffected by this fix. They benefit from the `search_path` fix indirectly since `is_admin()` itself is now safer.
