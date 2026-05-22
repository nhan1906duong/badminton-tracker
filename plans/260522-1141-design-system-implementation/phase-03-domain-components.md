# Phase 3: Domain Components

## Priority
P1 — App-specific, but reusable.

## Status
pending

## Description
Implement components specific to the badminton domain: MatchCard, SessionCard, ScoreBlock, ListItem, RankItem, StatRow, SectionHeader.

## Blocked By
Phase 2 (Core Components)

## Key Insights
- MatchCard has 3 states: Live, Ended (Win), Ended (Loss)
- SessionCard has 2 states: Active, Completed
- Both have Compact variants for lists
- ScoreBlock is used in match creation and results

## Components

### 1. MatchCard
```tsx
interface MatchCardProps {
  status: 'live' | 'ended';
  outcome?: 'win' | 'loss'; // for ended matches
  teamA: { name: string; players: string[] };
  teamB: { name: string; players: string[] };
  scoreA: number;
  scoreB: number;
  date: string;
  duration?: string;
  type: string;
  compact?: boolean;
}
```

### 2. SessionCard
```tsx
interface SessionCardProps {
  status: 'active' | 'completed';
  name: string;
  dateTime: string;
  duration: string;
  matchCount: number;
  topPlayer?: {
    name: string;
    initials: string;
    record: string; // e.g. "5W - 1L"
    winRate: number;
  };
  compact?: boolean;
}
```

### 3. ScoreBlock
```tsx
interface ScoreBlockProps {
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  editable?: boolean;
  onScoreChange?: (a: number, b: number) => void;
}
```

### 4. ListItem
```tsx
interface ListItemProps {
  avatar?: string; // initials or image URL
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onClick?: () => void;
}
```

### 5. RankItem
```tsx
interface RankItemProps {
  rank: number;
  avatar: string;
  name: string;
  stats: string;
  winRate: number;
}
```

### 6. StatRow
```tsx
interface StatRowProps {
  label: string;
  value: string | number;
}
```

### 7. SectionHeader
```tsx
interface SectionHeaderProps {
  title: string;
  action?: { label: string; onClick: () => void };
}
```

## Files to Create
- `design-system/components/match-card.tsx`
- `design-system/components/session-card.tsx`
- `design-system/components/score-block.tsx`
- `design-system/components/list-item.tsx`
- `design-system/components/rank-item.tsx`
- `design-system/components/stat-row.tsx`
- `design-system/components/section-header.tsx`

## Implementation Steps
1. Build MatchCard with Live + Ended states
2. Build SessionCard with Active + Completed states
3. Build ScoreBlock (read-only + editable modes)
4. Build ListItem, RankItem, StatRow, SectionHeader
5. Add all to barrel export

## Success Criteria
- [ ] MatchCard Live state shows pulsing dot + accent border
- [ ] MatchCard Ended state shows W/L indicator + winner emphasis
- [ ] SessionCard Active state shows "Live" badge + accent border
- [ ] Compact variants reduce padding and type sizes correctly
- [ ] All domain props are typed

## Risk Assessment
- **Medium risk** — More complex than core components, multiple states
- **Mitigation** — Build states as separate sub-components
