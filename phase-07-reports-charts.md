# Phase 7 — Reports & Charts

## Overview
- **Priority**: P2
- **Status**: Pending
- **Description**: Visual reports and charts for match trends and insights.

## Charts to Implement

### 1. Activity Over Time
- Line chart: Matches played per week/month
- Filter by player or all players

### 2. Win Rate Trend
- Line chart: Win rate over time (rolling window)
- Per player or compare multiple players

### 3. Head-to-Head
- Bar chart: Compare two players' win/loss record against each other

### 4. Partner Performance
- Bar chart: Win rate with different partners
- Who do you play best with?

### 5. Match Type Distribution
- Pie/donut chart: Singles vs Doubles vs Mixed

## Library: Recharts
- Already included in tech stack
- React-friendly
- Responsive charts

## Implementation Steps

1. **Dashboard page** (`/reports`):
   - Grid of chart cards
   - Date range selector
   - Player selector for filtering

2. **Chart components**:
   - `ActivityChart.tsx` — line chart for match frequency
   - `WinRateChart.tsx` — line chart for win rate trend
   - `HeadToHeadChart.tsx` — bar chart comparing two players
   - `PartnerChart.tsx` — horizontal bar for partner win rates
   - `MatchTypeChart.tsx` — donut chart

3. **Data preparation** (`src/lib/chart-data.ts`):
   - Transform match data into chart-friendly formats
   - Handle date grouping (daily, weekly, monthly)

## Files to Create
- `src/pages/ReportsPage.tsx`
- `src/components/charts/ActivityChart.tsx`
- `src/components/charts/WinRateChart.tsx`
- `src/components/charts/HeadToHeadChart.tsx`
- `src/components/charts/PartnerChart.tsx`
- `src/components/charts/MatchTypeChart.tsx`
- `src/lib/chart-data.ts`

## Success Criteria
- [ ] All 5 chart types render correctly
- [ ] Charts update with data changes
- [ ] Responsive on mobile
- [ ] Date/player filters work

## Next Steps
- Proceed to [Phase 8 — PWA Polish](phase-08-pwa-polish.md)
