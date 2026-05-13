# Phase 5 — Match History

## Overview
- **Priority**: P0
- **Status**: Pending
- **Description**: View all recorded matches, see match details, edit or delete matches.

## Requirements

### Match List
- Chronological list (newest first)
- Filter by match type
- Filter by player ("show matches involving this player")
- Search by player name
- Group by date (Today, Yesterday, This Week, Earlier)

### Match Card (list view)
- Date played
- Match type badge
- Team A players vs Team B players
- Winner indicator (highlight winning team)
- Score summary if available

### Match Detail
- Full match info
- All sets with scores
- All players with their teams
- Edit button
- Delete button (with confirmation)

### Edit Match
- Same form as creation but pre-filled
- Can change players, teams, scores, winner

## Implementation Steps

1. **Match list page** (`src/pages/MatchesPage.tsx`):
   - Fetch matches with related data (teams, participants, players)
   - Filter bar (match type, player, date range)
   - Infinite scroll or pagination

2. **Match card** (`src/components/MatchCard.tsx`):
   - Compact display for list view
   - Show winner highlight

3. **Match detail page** (`src/pages/MatchDetailPage.tsx`):
   - Route: `/matches/:id`
   - Full match breakdown
   - Action buttons: Edit, Delete

4. **Match hooks** (`src/hooks/useMatches.ts`):
   - `useMatches(filters)` — query with filters
   - `useMatch(id)` — single match with all relations
   - `useCreateMatch()` — mutation
   - `useUpdateMatch()` — mutation
   - `useDeleteMatch()` — mutation

## Files to Create
- `src/pages/MatchesPage.tsx`
- `src/pages/MatchDetailPage.tsx`
- `src/components/MatchCard.tsx`
- `src/components/MatchFilters.tsx`
- `src/hooks/useMatches.ts`

## Success Criteria
- [ ] All matches listed with correct info
- [ ] Filters work (type, player, date)
- [ ] Can view match detail
- [ ] Can edit existing match
- [ ] Can delete match with confirmation

## Next Steps
- Proceed to [Phase 6 — Ranking & Leaderboard](phase-06-ranking-leaderboard.md)
