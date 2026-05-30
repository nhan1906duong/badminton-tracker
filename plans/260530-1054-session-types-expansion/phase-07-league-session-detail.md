# Phase 07: League Session Detail

**Priority:** High — main league viewing experience  
**Status:** Pending  
**Estimated Effort:** Large  
**Blocked By:** [Phase 03](phase-03-league-hooks-and-utils.md), [Phase 06](phase-06-league-team-management.md)

## Context

Current `SessionDetailPage` shows: header, stats panel, matches list. For league sessions, need to add team standings and round-robin schedule.

## Requirements

### Functional
- League sessions show standings table instead of generic stats
- Round-robin schedule visible (round-by-round)
- Match list still shown below
- "Play" button on schedule cells to create match
- Champion announcement when session ends

### Non-functional
- Standings update in real-time as matches complete
- Schedule shows which fixtures are done vs pending
- Mobile-first layout (max 4 teams = compact table)

## Related Code Files

| Action | File |
|--------|------|
| Modify | `src/pages/SessionDetailPage.tsx` |
| Create | `src/components/LeagueStandingsTable.tsx` |
| Create | `src/components/LeagueScheduleGrid.tsx` |

## Implementation Steps

### 1. Conditional Rendering in SessionDetailPage

```typescript
const isLeague = session?.type === 'league'
```

League path:
```
header (name, type badge "League · MD", status, datetime)
├── Standings Table (replaces SessionStatsPanel)
├── Schedule Grid (new section)
└── Matches List (same as today)
```

Regular/Tournament path: unchanged.

### 2. League Standings Table Component

```
┌────┬────────────┬─────┬───┬───┬─────┐
│ #  │ Team       │ Pld │ W │ L │ Pts │
├────┼────────────┼─────┼───┼───┼─────┤
│ 1  │ 🔴 Red     │  3  │ 3 │ 0 │  6  │
│ 2  │ 🔵 Blue    │  3  │ 1 │ 2 │  2  │
│ 3  │ 🟢 Green   │  2  │ 0 │ 2 │  0  │
└────┴────────────┴─────┴───┴───┴─────┘
```

- Rank column (1st, 2nd, 3rd, 4th)
- Team name + optional color indicator
- Played, Wins, Losses, Points
- Highlight top team (champion if ended)
- If ended: show "🏆 Champion" badge on 1st place

### 3. League Schedule Grid Component

Collapsible round sections:
```
Round 1 ────────────── ▼
┌─────────────────────────────┐
│ Red vs Blue       [Play →]  │  ← not played
├─────────────────────────────┤
│ Green vs Yellow   3-1  ✓    │  ← completed
└─────────────────────────────┘

Round 2 ────────────── ▶
```

- Each cell shows team names + status
- "Play" button if no match exists for this fixture
- Score/result if match completed
- Tap completed cell → navigate to match detail

**Mapping fixtures to matches:**
For each fixture (round, teamA, teamB), check if any completed match in session has:
- All players from teamA on one match_team
- All players from teamB on other match_team

Store in a Map: `fixtureKey -> MatchWithDetails | null`

### 4. FAB Behavior

For league sessions:
- FAB opens a bottom sheet: "Play from schedule" or "Free match"
- "Play from schedule" → shows schedule, tap cell to create
- "Free match" → standard match creation (pick any teams)

### 5. Champion Display

When session ended:
- Standings table 1st place gets crown icon + "Champion"
- All players in champion team shown below standings
- Champion team stored in memory only (no DB field needed)

### 6. Menu Items

For league sessions, add to ⋮ menu:
- "Manage Teams" (live only) → Phase 06 editor
- Existing items: view stats, view donations, end session, delete

## Success Criteria

- [ ] League session detail shows standings table
- [ ] Standings update when matches are recorded
- [ ] Schedule grid shows all rounds and fixtures
- [ ] Tap "Play" on fixture → creates match with teams pre-filled
- [ ] Completed fixtures show result
- [ ] Ended league shows champion team
- [ ] Regular/tournament sessions unchanged

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Schedule grid too tall | Collapsible rounds, default expand current/next round |
| Standings table wide on mobile | Horizontal scroll or compact layout (4 teams max = fits) |
| Many rounds (2×3 = 6 for 4 teams) | Collapsible keeps page manageable |

## Next Steps

Proceed to [Phase 08: League Match Creation](phase-08-league-match-creation.md)
