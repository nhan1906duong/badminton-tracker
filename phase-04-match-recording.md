# Phase 4 — Match Recording

## Overview
- **Priority**: P0
- **Status**: Pending
- **Description**: The core feature — select 4 players for men's doubles, assign teams, record winners and optional scores.

## Requirements

### Player Selection
- Step 1: Select match type (default: Men's Doubles)
- Step 2: Select 4 players from available active players
- Auto-assign to Team A (2 players) and Team B (2 players)
- Allow manual re-shuffle of team assignments
- Validation: exactly 4 unique players for doubles

### Score Entry (Optional)
- Best-of-3 sets (default)
- Enter score per set (e.g., 21-15, 18-21, 21-19)
- Auto-detect winner from scores OR manual winner toggle
- If no scores entered, require manual winner selection

### Match Creation Flow
```
Select Match Type → Select Players → Assign Teams → Enter Scores (optional)
     → Mark Winner → Save Match
```

## Data Insertion Order (transaction)
1. Insert `match` record
2. Insert 2 `match_teams` records (TEAM_A, TEAM_B)
3. Insert 4 `match_participants` records
4. If scores: insert `match_scores` records (1-3 sets)

## Implementation Steps

1. **Match type selector** (`src/components/MatchTypeSelector.tsx`):
   - Dropdown: Men's Singles, Women's Singles, Men's Doubles (default), Women's Doubles, Mixed Doubles
   - Dynamically adjust player count: singles=2, doubles=4

2. **Player selector** (`src/components/PlayerSelector.tsx`):
   - Multi-select from active players list
   - Show selected count vs required count
   - Disable "Continue" until correct count selected

3. **Team assignment** (`src/components/TeamAssignment.tsx`):
   - Display selected players as draggable cards
   - Team A area (left) and Team B area (right)
   - "Shuffle" button for random assignment
   - Visual: Team A vs Team B layout

4. **Score entry** (`src/components/ScoreEntry.tsx`):
   - Set 1, Set 2, Set 3 inputs
   - Each set: Team A score vs Team B score
   - "Add Set" / "Remove Set" buttons
   - Auto-mark winner if 2 sets won

5. **Match form page** (`src/pages/NewMatchPage.tsx`):
   - Multi-step or single-page form combining all above
   - Submit button triggers database inserts

## Files to Create
- `src/pages/NewMatchPage.tsx`
- `src/components/MatchTypeSelector.tsx`
- `src/components/PlayerSelector.tsx`
- `src/components/TeamAssignment.tsx`
- `src/components/ScoreEntry.tsx`
- `src/hooks/useMatches.ts`
- `src/lib/match-helpers.ts` (validation, winner calculation)

## Success Criteria
- [ ] Can create a men's doubles match with 4 players
- [ ] Teams assigned correctly
- [ ] Scores optional but validated when entered
- [ ] Winner recorded correctly
- [ ] Match appears in database with all related records

## Next Steps
- Proceed to [Phase 5 — Match History](phase-05-match-history.md)
