# Phase 04: Update Session Hooks

**Priority:** High  
**Status:** Pending  
**Estimated Effort:** Small  
**Blocked By:** [Phase 02](phase-02-types-and-constants.md)

## Context

`src/hooks/useSessions.ts` handles session CRUD. Need to update create/delete to handle session types, and ensure queries return new fields.

## Requirements

### Functional
- `useCreateSession` accepts `type` + league config
- `useOpenSession` considers session type (league sessions are also "open" if not ended)
- `useDeleteSession` cascades to `league_teams` (FK handles this)
- All session queries select new fields

## Related Code Files

| Action | File |
|--------|------|
| Modify | `src/hooks/useSessions.ts` |

## Implementation Steps

1. **Update `useSessions` query** — select `type`, `league_match_type`, `league_total_rounds`
   ```typescript
   .select('*, bwf_tournaments(category_name, category_slug), type, league_match_type, league_total_rounds')
   ```

2. **Update `useOpenSession`** — no change to logic, just ensure new fields selected

3. **Update `useCreateSession` mutation input**
   ```typescript
   mutationFn: async (input: {
     type: SessionType
     label?: string
     started_at?: string
     bwf_tournament_id?: string
     league_match_type?: MatchType
     league_total_rounds?: number
   }) => {
     // ... validate league fields if type === 'league'
     if (input.type === 'league' && (!input.league_match_type || !input.league_total_rounds)) {
       throw new Error('League session requires match type and round count')
     }
     // ... existing bwf_tournament_id guard
     // insert with all fields
   }
   ```

4. **Update `useSession` query** — select new fields

5. **Update `useEndSession`** — no change. League standings computed on-the-fly, no stored data to update.

6. **Update `useDeleteSession`** — no change. `ON DELETE CASCADE` on `league_teams.session_id` handles cleanup.

7. **Update `useClearAllData`** — add `league_team_players` and `league_teams` deletion:
   ```typescript
   await supabase.from('league_team_players').delete().neq('id', '...')
   await supabase.from('league_teams').delete().neq('id', '...')
   ```
   (Note: these tables have composite PK, use `session_id` filter instead)

## Success Criteria

- [ ] Creating regular session works (same as today)
- [ ] Creating tournament session works with `bwf_tournament_id`
- [ ] Creating league session works with `league_match_type` + `league_total_rounds`
- [ ] Deleting league session removes teams and players automatically
- [ ] `useOpenSession` returns new fields

## Next Steps

Proceed to [Phase 05: Create Session Wizard](phase-05-create-session-wizard.md)
