# Phase 5 — League Team RPCs

## Context Links
- Overview: [plan.md](./plan.md)
- Hook: `src/hooks/useLeagueTeams.ts`

## Overview
- **Priority:** P3 — independent, lower traffic. Atomicity win on `useUpdateLeagueTeam` (team rename + roster swap + scheduled-match participant resync span many statements today).
- **Status:** pending

## Key Insights
- `useCreateLeagueTeam`: INSERT `league_teams` → INSERT `league_team_players`. Two statements; orphan risk. One RPC.
- `useUpdateLeagueTeam` is the complex one: optionally rename, optionally replace roster, then for each SCHEDULED match find the team-side whose roster matches the *previous* roster and resync its `match_participants`. The roster-matching logic (`sameRoster`) is set comparison — doable in PL/pgSQL but fiddly. **Decision: move the whole sequence into one RPC** `update_league_team(p_team_id, p_session_id, p_name, p_player_ids jsonb)`, doing the previous-roster lookup inside the RPC (it has all the data) rather than passing `previousPlayerIds` from the client. This is more robust than today's client-computed approach.
- `useDeleteLeagueTeam`: single DELETE (cascade handles `league_team_players`). One RPC.

## RPCs to Create (migration `20260625000015_league_team_rpcs.sql`)

| RPC | Replaces | Params | Returns |
|-----|----------|--------|---------|
| `create_league_team(p_session_id uuid, p_name text, p_player_ids jsonb)` | `useCreateLeagueTeam` | session_id, name, player ids | `league_teams` row |
| `update_league_team(p_team_id uuid, p_session_id uuid, p_name text, p_player_ids jsonb)` | `useUpdateLeagueTeam` | nullable name + nullable player_ids | void |
| `delete_league_team(p_team_id uuid)` | `useDeleteLeagueTeam` | team_id | void |

### `update_league_team`
```text
1. assert auth.uid() not null
2. if p_player_ids provided: read previous roster into v_prev (array of player_id for this team)
3. if p_name provided: update league_teams.name
4. if p_player_ids provided:
     a. delete league_team_players for team; insert new links
     b. for each SCHEDULED match in session:
          find the match team side whose participant player set == v_prev (exact set match)
          if found: delete its match_participants, insert new ones from p_player_ids
```
Use `null` params to mean "not provided" (matches the optional `name?` / `playerIds?` in the hook). For exact-set roster matching, compare sorted arrays or use `@>` / `<@` array containment with equal cardinality.

## Hook Changes
- `useCreateLeagueTeam`: `supabase.rpc('create_league_team', { p_session_id, p_name, p_player_ids })`; return `data` as team row.
- `useUpdateLeagueTeam`: replace entire body (incl. the previous-roster fetch + scheduled-match resync loop) with one rpc call. Pass `p_name: input.name ?? null`, `p_player_ids: input.playerIds ?? null`.
- `useDeleteLeagueTeam`: `supabase.rpc('delete_league_team', { p_team_id: teamId })`.
- Keep all `onSuccess` invalidations.

## Related Code Files
- Modify: `src/hooks/useLeagueTeams.ts` (3 mutations).
- Create: `supabase/migrations/20260625000015_league_team_rpcs.sql`.

## Implementation Steps
1. Write + apply migration.
2. Smoke-test roster swap resync: create a league session, edit a team's roster, verify SCHEDULED match participants updated and COMPLETED matches untouched.
3. Update the 3 hooks.
4. `npm run build && npm run test`.

## Todo List
- [ ] Migration `20260625000015_league_team_rpcs.sql`
- [ ] `useCreateLeagueTeam` on RPC
- [ ] `useUpdateLeagueTeam` on RPC (roster resync moved server-side)
- [ ] `useDeleteLeagueTeam` on RPC
- [ ] build + tests green

## Success Criteria
- Creating/renaming/deleting a league team and swapping a roster yields identical DB state to before.
- Roster swap only touches SCHEDULED matches; COMPLETED ones untouched.

## Risk Assessment
- **Roster set-matching in PL/pgSQL** must match the TS `sameRoster` (exact set equality, not subset). Mitigate: equal-cardinality + array containment both directions; test with a partial-overlap roster.

## Security Considerations
- League-team writes require authenticated (today's session-edit flows). Match `match_participants` write RLS (`012_authenticated_match_edits.sql`).

## Next Steps
- Final phase. After all 5, no hook contains `supabase.from(...).insert/update/delete` except storage ops in `useAvatarUpload`/`useClearAllData`.

## Unresolved Questions
- Confirm league-team writes should be any-authenticated (matches today) vs admin-only.
