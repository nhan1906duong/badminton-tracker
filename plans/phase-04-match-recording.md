# Phase 4 — Match Recording

## Overview
- **Priority**: P0
- **Status**: Complete
- **Description**: The core feature — select match type, pick players with auto team assignment, record winners and optional scores.

## Requirements

### Match Type Selection
- Default: Men's Doubles
- Switchable via grid selector at top: Men's Singles, Women's Singles, Men's Doubles, Women's Doubles, Mixed Doubles
- Dynamically adjusts required player count (singles=2, doubles=4)

### Player Selection
- **Quick pick**: Show ~6 most recently added players as large tappable cards (3-column grid)
- **All players**: Remaining players in 2-column grid
- **Auto team assignment** as players are selected:
  - Doubles: P1→Team A, P2→Team A, P3→Team B, P4→Team B
  - Singles: P1→Team A, P2→Team B
- Team badges shown on selected players (blue=Team A, red=Team B)
- **Add new player inline**: Type name + Add button, no email required
- Newly added player auto-selected and auto-assigned to next available team slot
- Shuffle button to randomize teams
- Team summary shown inline below player grid

### Score Entry (Optional)
- Best-of-3 sets (default)
- Enter score per set (e.g., 21-15, 18-21, 21-19)
- "Add Set" / "Remove Set" buttons
- Auto-mark winner if 2 sets won
- Manual winner toggle always available

### Match Creation Flow (3 steps)
```
Step 1: Match Type (grid selector)
Step 2: Select Players (quick pick + all players + inline add)
        → Teams auto-assigned, shuffle available
Step 3: Scores & Winner (optional scores + winner toggle)
        → Save Match
```

## Data Insertion Order (transaction)
1. Insert `match` record
2. Insert 2 `match_teams` records (TEAM_A, TEAM_B)
3. Insert 4 `match_participants` records
4. If scores: insert `match_scores` records (1-3 sets)

## Implementation

### Files
- `src/pages/NewMatchPage.tsx` — 3-step wizard with auto team assignment
- `src/components/MatchTypeSelector.tsx` — 5-type grid selector
- `src/components/PlayerSelector.tsx` — Quick pick (6 cards) + all players + inline add + team badges + team summary
- `src/components/ScoreEntry.tsx` — Set scores + winner toggle
- `src/hooks/useMatches.ts` — Create match mutation
- `src/hooks/usePlayers.ts` — Create player mutation (name only)
- `src/lib/match-helpers.ts` — Validation, winner calculation, shuffle

### Key UX Decisions
- **No separate team assignment step** — teams auto-assign as players are picked
- **Quick pick cards** are larger (3-col grid) for easy thumb tapping on mobile
- **Selected players show team badge** so users always know who's on which team
- **Inline player creation** avoids navigation away from match creation flow
- **Shuffle button** in team summary for when users want random teams

## Success Criteria
- [x] Default match type is Men's Doubles
- [x] Can switch match type via grid selector
- [x] Quick pick shows ~6 players as large cards
- [x] All other players shown in 2-column grid
- [x] Teams auto-assign: P1,P2→Team A; P3,P4→Team B (doubles)
- [x] Teams auto-assign: P1→Team A; P2→Team B (singles)
- [x] Can add new player with name only, inline
- [x] New player auto-selected and auto-assigned
- [x] Can shuffle teams
- [x] Scores optional but validated when entered
- [x] Winner recorded correctly
- [x] Match appears in database with all related records

## Next Steps
- Proceed to [Phase 5 — Match History](phase-05-match-history.md)
