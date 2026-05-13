# Phase 6 — Ranking & Leaderboard

## Overview
- **Priority**: P1
- **Status**: Pending
- **Description**: Calculate and display player statistics, rankings, and leaderboards.

## Statistics to Track

### Per Player
- Total matches played
- Wins / Losses
- Win rate (%)
- Matches as singles / doubles
- Current streak (win/loss)

### Per Team (Partners)
- Matches played together
- Wins / Losses as partners
- Win rate as a pair

### Ranking
- Sorted by win rate (min 5 matches to qualify)
- Alternative: ELO rating (future enhancement)
- Filter by match type
- Time period filter (all time, this month, this week)

## Implementation Approaches

### Option A: Computed on Demand (Recommended for v1)
- Query all matches
- Calculate stats in JavaScript
- Simple, no DB functions needed
- Works fine for < 1000 matches

### Option B: Materialized View (Future)
- PostgreSQL materialized view with pre-computed stats
- Refresh on match change
- Better for large datasets

## UI

### Leaderboard Page (`/leaderboard`)
- Tabs: Overall, Men's Doubles, Mixed Doubles, etc.
- Table: Rank | Player | Matches | Wins | Losses | Win Rate
- Sortable columns
- Top 3 highlighted (podium style)

### Player Detail Stats
- Stats card on player detail page
- Recent form (last 10 matches)
- Best partner (highest win rate with)

## Files to Create
- `src/pages/LeaderboardPage.tsx`
- `src/components/LeaderboardTable.tsx`
- `src/components/PlayerStatsCard.tsx`
- `src/lib/stats.ts` (calculation utilities)

## Success Criteria
- [ ] Leaderboard shows all players ranked by win rate
- [ ] Stats update when matches are added/edited/deleted
- [ ] Filter by match type works
- [ ] Player detail shows individual stats

## Next Steps
- Proceed to [Phase 7 — Reports & Charts](phase-07-reports-charts.md)
