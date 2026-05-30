# Phase 02: Types & Constants

**Priority:** Critical — blocks hook/page implementation  
**Status:** Pending  
**Estimated Effort:** Small  
**Blocked By:** [Phase 01](phase-01-database-migration.md)

## Context

`src/types/database.ts` defines TypeScript types for all Supabase tables. Need to add session type, league config, and new table types.

## Requirements

### Functional
- Add `SessionType` union type
- Update `Session` interface with new fields
- Add `LeagueTeam` and `LeagueTeamPlayer` interfaces
- Add helper constants for league team size requirements

## Related Code Files

| Action | File |
|--------|------|
| Modify | `src/types/database.ts` |

## Implementation Steps

1. **Add SessionType**
   ```typescript
   export type SessionType = 'regular' | 'tournament' | 'league'
   ```

2. **Update Session interface**
   ```typescript
   export interface Session {
     id: string
     type: SessionType                          // NEW
     label?: string | null
     started_at: string
     ended_at?: string | null
     bwf_tournament_id?: string | null
     league_match_type?: MatchType | null       // NEW
     league_total_rounds?: number | null        // NEW
     created_by: string
     created_at: string
     bwf_tournaments?: {
       category_name: string
       category_slug: string
     } | null
   }
   ```

3. **Add LeagueTeam**
   ```typescript
   export interface LeagueTeam {
     id: string
     session_id: string
     name: string
     created_at: string
   }
   ```

4. **Add LeagueTeamPlayer**
   ```typescript
   export interface LeagueTeamPlayer {
     league_team_id: string
     player_id: string
     player?: Player
   }
   ```

5. **Add LeagueTeamWithPlayers**
   ```typescript
   export interface LeagueTeamWithPlayers extends LeagueTeam {
     players: Player[]
   }
   ```

6. **Add helper: players required per match type**
   ```typescript
   export function getRequiredPlayersPerTeam(matchType: MatchType): number {
     return matchType === 'MEN_SINGLES' || matchType === 'WOMEN_SINGLES' ? 1 : 2
   }
   ```

7. **Update getSessionName to handle types**
   ```typescript
   export function getSessionName(session: Session, locale: Locale = 'en'): string {
     if (session.label) return session.label
     if (session.type === 'tournament' && session.bwf_tournaments) {
       return session.bwf_tournaments.category_name
     }
     // fallback to date
     return new Date(session.started_at).toLocaleDateString(LOCALE_TAG[locale], {
       weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
     })
   }
   ```

## Success Criteria

- [ ] All new types compile without error
- [ ] `getRequiredPlayersPerTeam` returns correct values for all 5 match types
- [ ] Existing types unchanged (backward compatible)
- [ ] `npm run build` type-checks pass

## Next Steps

Proceed to [Phase 03: League Hooks & Utils](phase-03-league-hooks-and-utils.md)
