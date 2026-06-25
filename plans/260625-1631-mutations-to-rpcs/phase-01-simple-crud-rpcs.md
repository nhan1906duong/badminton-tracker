# Phase 1 — Simple CRUD RPCs

## Context Links
- Overview: [plan.md](./plan.md)
- Hooks: `src/hooks/usePlayers.ts`, `usePlayerRackets.ts`, `usePlayerQuotes.ts`, `useSessions.ts` (basic mutations only), `useSessionAttendances.ts`, `useProfile.ts`, `useAvatarUpload.ts`
- RLS reference: `supabase/migrations/008_role.sql`

## Overview
- **Priority:** P2 — lowest risk, builds the RPC+hook pattern the later phases reuse.
- **Status:** pending
- Single-statement (or near-single) writes wrapped as RPCs. No business logic moves; this is mechanical.

## Key Insights
- These mutations are already 1 or 2 statements; the win is consistency + admin/auth checks centralized in the DB, not atomicity.
- `useDeletePlayer` is the one with a real ordering concern (delete `match_participants` first — no `ON DELETE CASCADE`). Wrap both deletes in one RPC.
- Avatar hooks: the **storage** upload/remove stays client-side (can't do storage from PL/pgSQL easily); only the `profiles`/`players` row write becomes an RPC. KISS — consider leaving avatar row writes as direct updates since they're single-statement and already covered by RLS. **Recommendation: include `set_entity_avatar(p_entity, p_id, p_url)` RPC for consistency but it's optional.**

## RPCs to Create (migration `20260625000010_crud_rpcs.sql`)

| RPC | Replaces | Params | Returns |
|-----|----------|--------|---------|
| `create_player(p_name text, p_email text)` | `useCreatePlayer` | name, email | `players` row |
| `update_player(p_id uuid, p_fields jsonb)` | `useUpdatePlayer` | id, partial fields as jsonb | `players` row |
| `delete_player(p_id uuid)` | `useDeletePlayer` | id | void |
| `create_player_racket(...)` | `useCreatePlayerRacket` | player_id, brand, real_name, nickname, mascot_id | `player_rackets` row |
| `update_player_racket(...)` | `useUpdatePlayerRacket` | id, brand, real_name, nickname, mascot_id | `player_rackets` row |
| `delete_player_racket(p_id uuid)` | `useDeletePlayerRacket` | id | void |
| `create_player_quote(p_player_id uuid, p_text text)` | `useCreatePlayerQuote` | player_id, text | `player_quotes` row |
| `update_player_quote(p_id uuid, p_text text)` | `useUpdatePlayerQuote` | id, text | `player_quotes` row |
| `delete_player_quote(p_id uuid)` | `useDeletePlayerQuote` | id | void |
| `create_session(p_input jsonb)` | `useCreateSession` | type/label/started_at/bwf_tournament_id/league_* | `sessions` row |
| `start_session(p_id uuid)` | `useStartSession` | id | `sessions` row |
| `update_session_start_time(p_id uuid, p_started_at timestamptz)` | `useUpdateSessionStartTime` | id, started_at | void |
| `rename_session(p_id uuid, p_label text)` | `useRenameSession` | id, label | void |
| `update_league_total_rounds(p_id uuid, p_total int)` | `useUpdateLeagueTotalRounds` | id, total | void |
| `upsert_attendance(p_session_id, p_player_id, p_status)` | `useUpsertAttendance` | session_id, player_id, status | void |
| `delete_attendance(p_session_id, p_player_id)` | `useDeleteAttendance` | session_id, player_id | void |
| `set_profile_player_link(p_user_id uuid, p_player_id uuid)` | `useUpdatePlayerLink` | user_id, player_id | void |
| `set_entity_avatar(p_entity text, p_id uuid, p_url text)` *(optional)* | avatar row writes | entity, id, url | void |

## Implementation Details

### Auth / admin enforcement (in-RPC)
- `delete_player` → guard `if not is_admin() then raise exception 'forbidden'; end if;` (matches `admins_delete_players` RLS).
- `create_session` → set `created_by = auth.uid()`; raise if `auth.uid()` is null.
- `set_profile_player_link` → guard `p_user_id = auth.uid()` (user can only link their own profile).
- Racket/quote create/update/delete: keep current behavior (own-profile-or-admin enforced at app layer today) — replicate by allowing any authenticated user (`auth.uid() is not null`). Do NOT tighten beyond current behavior (YAGNI).

### `create_session` duplicate-tournament guard
Port the `DuplicateTournamentError` check into the RPC:
```sql
if (p_input->>'bwf_tournament_id') is not null
   and exists (select 1 from sessions where bwf_tournament_id = (p_input->>'bwf_tournament_id')::uuid) then
  raise exception 'duplicate_tournament' using errcode = 'P0001';
end if;
```
Hook maps the `duplicate_tournament` error → re-throw `DuplicateTournamentError` so callers' `catch (e instanceof DuplicateTournamentError)` still works.

### `update_player(p_id, p_fields jsonb)`
Build dynamic update from jsonb keys to avoid one RPC per field. KISS alternative: explicit named params for the known editable columns (`name`, `email`, `avatar_url`, `active_racket_id`, `rating`, `nickname`). **Prefer the explicit-params version** — jsonb dynamic UPDATE is harder to audit and easier to break. Pass `null` to mean "no change" using `coalesce(p_x, current.x)`.

## Hook Changes
For each mutation, replace the `supabase.from(...)` chain with `supabase.rpc('<name>', { ... })`. Keep `.select().single()` semantics by having create/update RPCs `returns <table>` and reading `data` as the row. Leave all `onSuccess` invalidations unchanged.

Example (`useCreatePlayer`):
```ts
const { data, error } = await supabase.rpc('create_player', { p_name: player.name, p_email: player.email || null })
if (error) throw error
return data as Player
```

## Related Code Files
- Modify: the 7 hook files above.
- Create: `supabase/migrations/20260625000010_crud_rpcs.sql`.
- Delete: none.

## Implementation Steps
1. Write the migration with all RPCs + `grant execute ... to authenticated, anon` (match each table's current read/write grants).
2. Run migration locally / in Supabase; smoke-test each RPC in SQL editor.
3. Update `usePlayers.ts`, `usePlayerRackets.ts`, `usePlayerQuotes.ts`.
4. Update `useSessionAttendances.ts`, `useProfile.ts`.
5. Update the basic session mutations in `useSessions.ts` (`useCreateSession`, `useStartSession`, `useUpdateSessionStartTime`, `useRenameSession`, `useUpdateLeagueTotalRounds`) — leave `useEndSession`/`useDeleteSession`/`useClearAllData`/`useRecalculateAllRatings` for Phase 4.
6. (Optional) Update avatar row writes in `useAvatarUpload.ts`.
7. `npm run build && npm run test`.

## Todo List
- [ ] Migration `20260625000010_crud_rpcs.sql` written + applied
- [ ] `usePlayers.ts` on RPCs (incl. `delete_player` ordering)
- [ ] `usePlayerRackets.ts` on RPCs
- [ ] `usePlayerQuotes.ts` on RPCs
- [ ] `useSessionAttendances.ts` on RPCs
- [ ] `useProfile.ts` on RPC
- [ ] basic `useSessions.ts` mutations on RPCs (+ DuplicateTournamentError mapping)
- [ ] (optional) `useAvatarUpload.ts` row writes on RPC
- [ ] build + tests green

## Success Criteria
- Every listed mutation calls an RPC; no remaining `supabase.from(...).insert/update/delete` in these hooks (except storage ops).
- `DuplicateTournamentError` and `delete_player` ordering behavior preserved.
- Admin-only delete-player still blocked for non-admins.
- Build + existing tests pass.

## Risk Assessment
- **Grant audience mismatch** → anon users lose/gain access. Mitigate: mirror current RLS grant audience per table exactly.
- **jsonb param parsing** for `create_session` → null/undefined handling. Mitigate: prefer explicit named params where practical.

## Security Considerations
- `SECURITY DEFINER` bypasses RLS — every RPC must re-check auth/admin where the table's RLS previously enforced it (delete_player, create_session ownership, profile link ownership).

## Next Steps
- Establishes the RPC+hook pattern reused by Phases 2–5.

## Unresolved Questions
- Should avatar row writes become RPCs, or stay direct (single-statement, already RLS-covered)? Leaning: keep direct (YAGNI) unless team wants zero direct writes.
- `update_player`: explicit named params vs. jsonb? Plan recommends explicit.
