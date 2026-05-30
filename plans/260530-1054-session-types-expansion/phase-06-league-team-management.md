# Phase 06: League Team Management

**Priority:** Medium — teams may need editing after creation  
**Status:** Pending  
**Estimated Effort:** Medium  
**Blocked By:** [Phase 05](phase-05-create-session-wizard.md)

## Context

After creating a league, users may want to edit team names or rosters before any matches are played. Need UI for this.

## Requirements

### Functional
- Edit team name
- Add/remove players from team roster
- Add new team (if under max)
- Delete team (if no matches played yet)
- Validation: roster size must meet match type requirement

### Non-functional
- Only allowed when session is live (not ended)
- Preferably before any matches played (to avoid invalidating standings)

## Related Code Files

| Action | File |
|--------|------|
| Create | `src/components/LeagueTeamEditor.tsx` |
| Modify | `src/pages/SessionDetailPage.tsx` (add menu item) |

## Implementation Steps

### 1. League Team Editor (Bottom Sheet or Page)

Bottom sheet accessed from session detail ⋮ menu:

```
┌─────────────────────────────┐
│ Manage Teams                │
├─────────────────────────────┤
│ Team Red                    │
│ ┌─────────────────────────┐ │
│ │ [Red]           [Edit]  │ │
│ │ ○ Player A  [×]         │ │
│ │ ○ Player B  [×]         │ │
│ │ [+ Add player]          │ │
│ └─────────────────────────┘ │
│                             │
│ Team Blue                   │
│ ...                         │
│                             │
│ [+ Add Team] (if < 4)      │
└─────────────────────────────┘
```

### 2. Edit Team Name

Inline or bottom sheet with text input.

### 3. Add/Remove Players

- Remove: tap × on player chip
- Add: tap "+ Add player" → bottom sheet player picker
- Validation: warn if roster < required players for match type

### 4. Add Team

- Show "+ Add Team" button if team count < 4
- Opens same form as creation wizard team builder

### 5. Delete Team

- Show delete option in team card menu
- Warn if team has played matches (check via standings or match participants)
- Admin-only or session creator only

### 6. Menu Integration

Add "Manage Teams" to SessionDetailPage ⋮ menu when `session.type === 'league' && sessionStatus === 'live'`.

## Success Criteria

- [ ] Can rename team
- [ ] Can add player to team roster
- [ ] Can remove player from team roster
- [ ] Can add new team (up to 4)
- [ ] Can delete team
- [ ] Validation prevents roster below minimum

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Editing teams after matches played | Warn user; recalculate standings automatically |
| Deleting team with match history | Block or warn; standings will have orphaned data |

## Next Steps

Proceed to [Phase 07: League Session Detail](phase-07-league-session-detail.md)
