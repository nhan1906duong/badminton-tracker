# Phase 05: Create Session Wizard

**Priority:** High — primary user-facing change  
**Status:** Pending  
**Estimated Effort:** Large  
**Blocked By:** [Phase 04](phase-04-update-session-hooks.md)

## Context

Current `CreateSessionPage` has one flow: pick tournament or custom name, then pick start time. Need to add type selection and multi-step wizard for league.

## Requirements

### Functional
- Step 1: Pick session type (Regular / Tournament / League)
- Step 2a (Regular): Name input + start time
- Step 2b (Tournament): BWF list pick + start time (same as today)
- Step 2c (League): Name + match type picker + rounds picker
- Step 3 (League only): Create teams + add players to each
- Step 4 (League only): Review + create

### Non-functional
- Smooth transitions between steps
- Validation at each step
- Can go back to previous step

## Related Code Files

| Action | File |
|--------|------|
| Modify | `src/pages/CreateSessionPage.tsx` |
| Create | `src/components/SessionTypePicker.tsx` |
| Create | `src/components/LeagueConfigForm.tsx` |
| Create | `src/components/LeagueTeamBuilder.tsx` |

## Implementation Steps

### 1. Session Type Picker Component

Horizontal scroll or vertical stack of 3 cards:
- **Regular** — "Free-play session" icon: calendar/play
- **Tournament** — "BWF World Tour" icon: trophy  
- **League** — "Team competition" icon: users/shield

Each card: icon, title, description. Tap to select, highlighted state.

### 2. Refactor CreateSessionPage to Wizard

Use step state machine:
```typescript
type WizardStep = 'type' | 'config' | 'teams' | 'review'

const [step, setStep] = useState<WizardStep>('type')
const [sessionType, setSessionType] = useState<SessionType>('regular')
```

Step transitions:
```
'type' → 'config' (all types)
'config' → 'teams' (league only)
'config' → review/create (regular/tournament — immediate create)
'teams' → 'review'
'review' → create + navigate to session
```

### 3. Config Step UI

**Regular:**
- Name input (same as today's custom name)
- Start time (now/schedule)

**Tournament:**
- BWF tournament list (same as today)
- Start time

**League:**
- Name input
- Match type selector: 5 chips (MS, WS, MD, WD, XD)
- Rounds selector: segmented (1 round / 2 rounds)
- Start time

### 4. Teams Step UI (League only)

Team builder with up to 4 teams:
```
Team 1
┌─────────────────────────────┐
│ [Team name input]           │
│ Players: [+ Add player]     │
│ ○ Player A    ○ Player B    │
└─────────────────────────────┘

+ Add another team (max 4)
```

- Each team needs name + at least `requiredPlayers` players
- Player picker: bottom sheet with all players (same as match creation)
- Validation: show error if team has insufficient players
- Disable "Next" until all teams valid

### 5. Review Step (League only)

Summary before create:
```
League: "My League"
Match type: Men's Doubles
Rounds: 2
Teams:
  Red (3 players)
  Blue (2 players)
Schedule: 6 rounds, 12 matches total
```

Create button → calls `useCreateSession` → then creates teams via `useCreateLeagueTeam` → navigates to session detail.

### 6. Back Navigation

- AppBar back button goes to previous wizard step (not navigate(-1))
- On step 'type', back = cancel (navigate(-1))

## Success Criteria

- [ ] Can create regular session (same as today)
- [ ] Can create tournament session (same as today)
- [ ] Can create league session via 3-step wizard
- [ ] League creation validates team sizes match match type requirement
- [ ] Back button navigates wizard steps correctly
- [ ] Cancel at any point returns to sessions list

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Page becomes too large | Split into sub-components (type picker, config form, team builder) |
| Complex state management | Use local useState, no need for store (single page flow) |

## Next Steps

Proceed to [Phase 06: League Team Management](phase-06-league-team-management.md)
