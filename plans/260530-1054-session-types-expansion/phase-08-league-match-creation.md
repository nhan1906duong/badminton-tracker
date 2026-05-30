# Phase 08: League Match Creation

**Priority:** High — how league matches are created  
**Status:** Pending  
**Estimated Effort:** Medium  
**Blocked By:** [Phase 07](phase-07-league-session-detail.md)

## Context

Current `CreateMatchPage` lets user pick match type, then players, then when. For league sessions, match type is pre-determined and teams are pre-selected.

## Requirements

### Functional
- League match creation pre-fills match type from session config
- Team A and Team B pre-selected (from schedule tap or manual)
- Player picker shows only roster players for each team
- Number of players per team determined by match type
- Rest of flow same: when (now/schedule/queue) → save

### Non-functional
- Player picker filtered to team roster
- Auto-fill players if roster size == required count

## Related Code Files

| Action | File |
|--------|------|
| Modify | `src/pages/CreateMatchPage.tsx` |
| Create | `src/components/LeaguePlayerPicker.tsx` |

## Implementation Steps

### 1. Detect League Context

`CreateMatchPage` receives `sessionId` from route. Fetch session to check `type === 'league'`.

If league:
- Skip match type selector (use `session.league_match_type`)
- Show team selection instead of free player pick

### 2. League Match Creation Flow

```
┌─────────────────────────────────────────┐
│ Create Match — Men's Doubles            │
│ (League match type shown, not editable) │
├─────────────────────────────────────────┤
│ Team A: [Red ▼]                         │
│ Players: [Player A] [Player B]          │
│         [+ Pick from Red roster]        │
├─────────────────────────────────────────┤
│ Team B: [Blue ▼]                        │
│ Players: [Player C] [Player D]          │
│         [+ Pick from Blue roster]       │
├─────────────────────────────────────────┤
│ When: [Now] [Schedule] [Queue]          │
├─────────────────────────────────────────┤
│ [Create Match]                          │
└─────────────────────────────────────────┘
```

### 3. Team Selection

If navigated from schedule cell:
- Team A and Team B pre-selected
- Player slots shown, empty until filled

If free match creation:
- Team A dropdown: all league teams
- Team B dropdown: all league teams except Team A

### 4. Player Picker

- Tap player slot → bottom sheet with team roster
- Roster filtered by match type requirements:
  - MD: all male players in roster
  - WD: all female players in roster
  - XD: male + female tabs in picker
- Multi-select if match type requires 2 players
- Auto-select if roster has exactly required count

### 5. Validation

- Both teams must have required number of players selected
- Team A != Team B
- Players within a team must be distinct

### 6. URL Params for Pre-fill

When tapping schedule cell:
```
/sessions/:id/matches/new?teamA=teamId1&teamB=teamId2
```

`CreateMatchPage` reads query params to pre-select teams.

### 7. Save

Same as today — `useCreateMatch` with:
- `match_type: session.league_match_type!`
- `session_id: session.id`
- players from selected team rosters
- when: now/schedule/queue

## Success Criteria

- [ ] League match creation skips type selector
- [ ] Teams pre-filled when coming from schedule
- [ ] Player picker shows only team roster
- [ ] Correct number of players per team enforced
- [ ] Validation prevents incomplete teams
- [ ] Match saves and appears in session matches list
- [ ] Standings update after match completed

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Player gender not tracked | Add gender to players table? Or skip gender filter for v1, let user pick any roster player. |
| Roster player already in another match | Not an issue — players can play multiple matches |

## Next Steps

Proceed to [Phase 09: Testing & Validation](phase-09-testing-and-validation.md)
