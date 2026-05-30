# Code Review: Session Types Expansion

## Scope
- **Files**: 16 files (7 new, 9 modified)
- **LOC**: ~6,800 total (~1,300 new, ~5,500 modified)
- **Focus**: Session types (regular/tournament/league), league team management, round-robin scheduling
- **Branch**: feature/session-league

## Overall Assessment
Solid feature implementation. The wizard flow for session creation is clean, the round-robin algorithm is correct, and the league standings computation follows existing patterns. TypeScript compiles clean. All 239 tests pass. Two minor lint errors in new code, one algorithmic bug in round-robin, and several edge cases need attention before merge.

---

## Critical Issues

### 1. Round-Robin Algorithm Bug: Incorrect Rotation Logic
**File**: `src/lib/round-robin.ts` (lines 31-36)

The circle method rotation is broken. The current code:
```ts
const rotation = Array.from({ length: n }, (_, i) => i)
const rotated = [
  rotation[0],
  ...rotation.slice(1).slice(round).concat(rotation.slice(1, round + 1)),
]
```

This produces `[0, 1, 2, 3, 4]` for every round when `n=5`, because `slice(round)` on `round=0` returns `[1,2,3,4]` and `slice(1,1)` returns `[]`, giving `[0, 1, 2, 3, 4]`. For `round=1`, `slice(1)` on `[1,2,3,4]` returns `[2,3,4]` and `slice(1,2)` returns `[2]`, giving `[0, 2, 3, 4, 2]` — duplicates and incorrect.

**Impact**: Every cycle repeats the same round-1 pairings. Teams play the same opponents every round.

**Fix**: Use proper cyclic rotation:
```ts
const rotation = Array.from({ length: n }, (_, i) => i)
// Rotate positions 1..n-1 by `round` steps
const rotated = [
  rotation[0],
  ...rotation.slice(1).map((_, i) => {
    const idx = 1 + ((i + round) % (n - 1))
    return rotation[idx]
  }),
]
```

Or simpler: precompute pairings using standard circle method with a fixed array and proper rotation.

---

## High Priority

### 2. Missing UPDATE RLS Policy for `league_teams`
**File**: `supabase/migrations/015_session_types.sql` (lines 36-50)

RLS policies cover SELECT, INSERT, DELETE but not UPDATE. The `useUpdateLeagueTeam` hook updates team names, which will fail with 403 for non-owner users.

**Fix**: Add UPDATE policy:
```sql
CREATE POLICY "league_teams_update_session_owner"
  ON league_teams FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions WHERE sessions.id = league_teams.session_id AND sessions.created_by = auth.uid()
  ));
```

### 3. Missing UPDATE RLS Policy for `league_team_players`
**File**: `supabase/migrations/015_session_types.sql` (lines 52-72)

Same gap: no UPDATE policy. The `useUpdateLeagueTeam` hook deletes-then-inserts player links, so INSERT/DELETE are used, but if the implementation ever changes to use UPDATE, it will fail.

**Fix**: Add UPDATE policy (defensive):
```sql
CREATE POLICY "ltp_update_team_owner"
  ON league_team_players FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM league_teams
    JOIN sessions ON league_teams.session_id = sessions.id
    WHERE league_teams.id = league_team_players.league_team_id AND sessions.created_by = auth.uid()
  ));
```

### 4. League Team Creation Not Atomic
**File**: `src/pages/CreateSessionPage.tsx` (lines 301-312)

If session creation succeeds but one league team creation fails (network error, RLS rejection), the session exists with partial teams. No rollback mechanism.

**Impact**: Orphan session with incomplete team setup. User must manually clean up.

**Fix**: Wrap in a Supabase RPC function, or at minimum handle partial failure:
```ts
// After creation, if any team fails, show error and offer retry
const results = await Promise.allSettled(leagueTeams.map(...))
const failures = results.filter(r => r.status === 'rejected')
if (failures.length > 0) {
  // Show retry UI or auto-retry
}
```

### 5. `useLeagueStandings` Hook: Fragile Team Mapping
**File**: `src/hooks/useLeagueStandings.ts` (lines 55-59)

Maps match winner to league team via `playerToTeam.get(winnerPlayerIds[0])`. If the first player on a match team has been removed from the league team (via team editor), the mapping fails silently and the match is skipped.

**Impact**: Standings become incorrect after team roster changes.

**Fix**: Check if ANY player from the match team belongs to the league team:
```ts
const winnerLeagueTeamId = winnerPlayerIds
  .map(id => playerToTeam.get(id))
  .find(id => id !== undefined)
```

---

## Medium Priority

### 6. Lint Error: Unused Import
**File**: `src/components/LeagueTeamBuilder.tsx` (line 2)
```ts
import type { Player, MatchType } from '../types/database'
```
`Player` is imported but never used. Remove it.

### 7. Lint Error: Unused Parameter
**File**: `src/hooks/useLeagueTeams.ts` (line 113)
```ts
export function useDeleteLeagueTeam() {
  ...
  mutationFn: async ({ teamId, sessionId: _sessionId }: { teamId: string; sessionId: string }) => {
```
`_sessionId` is prefixed with underscore but ESLint still flags it. Either remove the rename or use the parameter (e.g., for optimistic updates).

### 8. `LeagueScheduleGrid`: O(n*m) Match Lookup Per Fixture
**File**: `src/components/LeagueScheduleGrid.tsx` (lines 37-76)

The `fixtureToMatch` useMemo iterates all fixtures and for each does `completedMatches.find()` — O(fixtures * matches). With 4 teams * 2 rounds = 12 fixtures and 100 matches, this is trivial, but with more teams/rounds it scales poorly.

**Fix**: Pre-index matches by a sorted player-set key for O(1) lookup:
```ts
const matchKey = (playerIds: string[]) => playerIds.sort().join(',')
// Build index once, then lookup
```

### 9. `CreateMatchPage`: League Auto-Fill Effect Runs Too Often
**File**: `src/pages/CreateMatchPage.tsx` (lines 296-314)

The auto-fill effect depends on `teamA` and `teamB` arrays, causing it to re-run whenever any slot changes. The `teamA.every((id) => id === null)` guard prevents re-filling, but the effect still executes on every slot change.

**Fix**: Add a ref-based "has auto-filled" flag to prevent repeated execution:
```ts
const hasAutoFilledA = useRef(false)
// In effect: if (hasAutoFilledA.current) return
```

### 10. `LeagueTeamBuilder`: Player Can Be on Multiple Teams
**File**: `src/components/LeagueTeamBuilder.tsx` (line 82-84)

Comment says "Show all players (can be on multiple teams in v1)" and the picker disables used players but allows adding them. This is intentional per v1 design, but the `usedPlayerIds` Set and `isUsed` disabled state are contradictory — the UI disables the button but the comment says it's allowed.

**Clarify**: Either remove the disabled state (allow multi-team) or enforce single-team membership. Current UX is confusing.

### 11. Missing Vietnamese Translations for League Terms
**File**: `src/i18n.tsx`

The Vietnamese locale block is missing translations for new league keys:
- `sessionDetail.manageTeams`
- `sessionDetail.standings`
- `sessionDetail.schedule`
- `sessionDetail.round`
- `sessionDetail.playMatch`
- `sessionDetail.completedShort`
- `sessionDetail.pendingShort`
- `createSession.typeLeague`
- `createSession.typeLeagueDesc`
- `createSession.selectType`
- `createSession.leagueName`
- `createSession.matchType`
- `createSession.rounds`
- `createSession.oneRound`
- `createSession.twoRounds`
- `createSession.teams`
- `createSession.addTeam`
- `createSession.teamNamePlaceholder`
- `createSession.needsPlayers`
- `createSession.invalidTeam`
- `createSession.review`
- `createSession.leagueSummary`
- `createSession.createLeague`

**Impact**: Vietnamese users see English fallback or raw keys.

### 12. `getSessionName` Helper Does Not Handle League Sessions
**File**: `src/types/database.ts` (lines 166-175)

```ts
export function getSessionName(session: Session, locale: string = 'en'): string {
  if (session.label) return session.label
  if (session.type === 'tournament' && session.bwf_tournaments) {
    return session.bwf_tournaments.category_name
  }
  // Falls through to date for league sessions without labels
```

League sessions without labels fall through to date display. Consider adding a league-specific fallback like `"League · {date}"`.

---

## Low Priority

### 13. `LeagueTeamEditor`: Delete Confirmation Not Translated
**File**: `src/components/LeagueTeamEditor.tsx` (lines 342-349)

```tsx
<div style={{...}}>Delete team?</div>
<div>This team will be removed from the league.</div>
```

Hardcoded English strings. Should use `t()` keys.

### 14. `CreateSessionPage`: Review Step Shows Raw Match Type
**File**: `src/pages/CreateSessionPage.tsx` (line 811)

```tsx
<span>{leagueMatchType.replace('_', ' ')}</span>
```

Uses string replacement instead of `matchTypeLabel(leagueMatchType, t)`. Inconsistent with rest of app.

### 15. `useClearAllData` Missing `matches` Invalidation
**File**: `src/hooks/useSessions.ts` (lines 418-422)

The `useClearAllData` onSuccess invalidates sessions, players, and profiles but not matches. After clearing data, match queries may show stale data.

**Fix**: Add `qc.invalidateQueries({ queryKey: ['matches'] })` and `qc.invalidateQueries({ queryKey: ['league-teams'] })`.

### 16. `LeagueScheduleGrid`: Key Collision Risk
**File**: `src/components/LeagueScheduleGrid.tsx` (line 71)

```ts
const key = `${f.round}-${f.teamAIndex}-${f.teamBIndex}`
```

This is fine for the current scope but could collide if team indices ever exceed 2 digits. Use a delimiter like `|`:
```ts
const key = `${f.round}|${f.teamAIndex}|${f.teamBIndex}`
```

### 17. `SessionTypePicker`: Missing `aria-label` on Radio Group
**File**: `src/components/SessionTypePicker.tsx` (line 35)

Has `role="radiogroup"` and `aria-label` — good. But individual buttons lack `aria-label` beyond their text content. Screen readers will read the visible text which is sufficient.

---

## Edge Cases Found by Scout

1. **Empty league teams array**: `LeagueScheduleGrid` returns `null` when `teams.length < 2`, but `LeagueStandingsTable` returns `null` when `!standings || standings.length === 0`. If a league session has teams but no completed matches, standings is non-null (all zeros) and renders an empty-looking table. Consider showing a "no matches yet" message.

2. **Team deleted mid-session**: If a league team is deleted after matches have been recorded, `useLeagueStandings` will not find the team in the standings Map and skip processing matches involving that team. Historical matches become invisible in standings. Consider keeping deleted teams in standings with a "(deleted)" marker.

3. **Odd team count**: `generateRoundRobin` handles odd counts with a dummy team (bye), but the UI never shows bye rounds. Users may be confused why the total match count is less than expected. The `getRoundRobinMatchCount` function correctly computes pairs * rounds, but the schedule grid won't show bye fixtures.

4. **League match type changed after creation**: The DB schema allows `league_match_type` to be updated, but changing it after teams are created could invalidate team rosters (e.g., singles -> doubles requires more players). No validation prevents this.

5. **Duplicate team names**: `LeagueTeamBuilder` and `LeagueTeamEditor` allow teams with identical names. The schedule grid and standings would show ambiguous rows. Consider adding uniqueness validation.

6. **Session type migration**: Existing sessions are migrated to 'tournament' if they have `bwf_tournament_id`. But what if a regular session was manually given a tournament-like label? It stays 'regular'. This is correct per the migration logic, but worth noting.

7. **League session with 0 rounds**: The DB default is 2, but `league_total_rounds` is nullable. A league session with `total_rounds = 0` or `null` would pass the CHECK constraint (since `type != 'league' OR (...)` evaluates the second clause only for league). Actually for league, `league_total_rounds IS NOT NULL` is required, so 0 would pass but produce 0 fixtures. The UI handles this (no schedule shown if `teams.length < 2`).

8. **Race condition in team creation**: `CreateSessionPage` uses `Promise.all` for parallel team creation. If the user navigates away mid-creation, some teams may be created while others are not. The `isPending` flag prevents double-submission but doesn't handle navigation.

---

## Positive Observations

- **Type safety**: `SessionType` union type is clean, TypeScript compiles with zero errors.
- **Wizard pattern**: The 4-step wizard (`type -> config -> teams -> review`) is well-structured with clear navigation guards.
- **RLS policies**: Owner-based policies follow existing pattern from sessions table. Good defense in depth.
- **Check constraint**: `chk_league_fields` ensures data integrity at DB level.
- **Hook patterns**: `useLeagueTeams`, `useLeagueStandings` follow existing TanStack Query conventions with proper invalidation.
- **Accessibility**: `SessionTypePicker` uses proper `role="radio"` and `aria-checked` attributes.
- **Test coverage**: Existing tests updated for wizard flow, all 239 tests pass.
- **Migration safety**: Existing sessions migrated automatically with `DEFAULT 'regular'`.
- **Separation of concerns**: Round-robin logic isolated in `src/lib/round-robin.ts`, standings computation in hook, presentation in components.

---

## Recommended Actions (Prioritized)

1. **Fix round-robin rotation algorithm** (Critical)
2. **Add UPDATE RLS policies** for `league_teams` and `league_team_players` (High)
3. **Fix `useLeagueStandings` team mapping** to check any player, not just first (High)
4. **Add error handling for partial team creation failure** (High)
5. **Fix lint errors** (unused import, unused parameter) (Medium)
6. **Add Vietnamese translations** for all new keys (Medium)
7. **Optimize `fixtureToMatch` lookup** with pre-indexed match map (Medium)
8. **Add `hasAutoFilled` ref guard** in `CreateMatchPage` league effect (Medium)
9. **Fix review step match type display** to use `matchTypeLabel()` (Low)
10. **Translate delete confirmation** in `LeagueTeamEditor` (Low)
11. **Add `matches` and `league-teams` invalidation** to `useClearAllData` (Low)

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | 100% (0 tsc errors) |
| Test Coverage | 239/239 passing |
| Lint Issues | 2 in new code, 10 pre-existing |
| New Files | 7 |
| Modified Files | 9 |
| Total LOC Reviewed | ~6,800 |

---

## Unresolved Questions

1. Should league sessions support the "schedule" start mode, or are they always "now"? The wizard allows scheduling a league session but the schedule grid only shows after the session starts.
2. What happens when a league session ends? Should standings be frozen/snapshotted, or do they continue to update if matches are edited?
3. Is there a plan to enforce unique player membership across teams in a future version? The v1 comment suggests this is intentional.
4. Should the `useDeleteLeagueTeam` hook use the `sessionId` parameter for optimistic updates or is it truly unused?
