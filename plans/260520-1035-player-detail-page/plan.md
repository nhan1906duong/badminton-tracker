# Player Detail Page - Implementation Plan

## Overview

Add a player detail page at `/players/:playerId` with editable name/avatar, stats summary, best partner card, and paginated match history with infinite scroll.

**Priority:** High
**Status:** Complete ✅
**Estimated Effort:** 1-2 dev sessions

---

## Context Links

- Related files: `src/pages/PlayersPage.tsx`, `src/components/AnimatedRoutes.tsx`, `src/hooks/usePlayers.ts`, `src/hooks/useMatches.ts`, `src/hooks/usePlayerStats.ts`
- Pattern reference: `src/pages/SessionDetailPage.tsx` (MatchCard list), `src/pages/SettingsPage.tsx` (avatar editing)

---

## Key Insights

1. **No DB schema changes needed** - all data exists in current tables.
2. **Reuse existing patterns** - AvatarPicker, Avatar, MatchCard, useAvatarUpload hooks all work as-is.
3. **Pagination via Supabase** - use `range()` for offset/limit pagination; no cursor needed since order is by `played_at desc`.
4. **Best partner computed client-side** - doubles matches only; filter and aggregate from match data.
5. **AppBar integration** - new route needs title mapping and tab-bar hiding (non-tab route).
6. **Navigation tests** must be updated to include the new route.

---

## Requirements

### Functional

1. Tapping a player on `/players` navigates to `/players/:playerId`.
2. Player detail page shows:
   - Header with back button (via existing AppBar).
   - Editable avatar (tap to open AvatarPicker).
   - Editable name (inline edit, blur/Enter to save).
   - Stats row: total matches, wins, losses, donated amount.
   - Best partner card (doubles-only, highest win rate, tie-break by most wins).
   - Match history list with infinite scroll (~10 per batch).
3. Each match in history shows match type, teams, scores, result.
4. Pull-to-refresh or scroll-to-load-more for match history.

### Non-Functional

- Keep page responsive and mobile-first.
- Reuse existing components/hooks; avoid duplication.
- Follow existing file size guideline (<200 lines per file).

---

## Architecture

### Data Flow

```
PlayerDetailPage
├── usePlayer(playerId)        -> single player query + update mutation
├── usePlayerMatches(playerId, page) -> paginated match history
├── useBestPartner(playerId)   -> computed best partner stats
└── AvatarPicker               -> reuse existing component
```

### Route

- Path: `/players/:playerId`
- Auth required: yes
- Tab bar: hidden
- AppBar: shown with title "Player Detail"

---

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/usePlayer.ts` | Query single player by ID; wrap `useUpdatePlayer` for name changes |
| `src/hooks/usePlayerMatches.ts` | Paginated match history (10/page) via Supabase |
| `src/hooks/useBestPartner.ts` | Compute best doubles partner from all player matches |
| `src/pages/PlayerDetailPage.tsx` | Main page component |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/AnimatedRoutes.tsx` | Add `{ path: '/players/:playerId', element: <PlayerDetailPage />, auth: true }` to routes array |
| `src/pages/PlayersPage.tsx` | Wrap player item in `navigate(`/players/${player.id}`)`; keep swipe-to-delete but add tap-to-navigate |
| `src/App.tsx` | Add `/players/:playerId` to `getPageTitle` -> return "Player Detail" |
| `src/components/__tests__/navigation.test.tsx` | Add `/players/:playerId` to route matching tests and appBar/tabBar tests |

---

## Implementation Steps

### Phase 1: Hooks (Foundation)

#### Step 1.1: `usePlayer.ts`

```typescript
// Query single player by ID
export function usePlayer(id: string) {
  return useQuery({
    queryKey: [PLAYERS_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase.from('players').select('*').eq('id', id).single()
      if (error) throw error
      return data as Player
    },
    enabled: !!id,
  })
}

// Wrap updatePlayer for name changes with player-specific invalidation
export function useUpdatePlayerName() {
  const qc = useQueryClient()
  const update = useUpdatePlayer()
  return useMutation({
    ...update,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [PLAYERS_KEY] })
      qc.invalidateQueries({ queryKey: [PLAYERS_KEY, data.id] })
    },
  })
}
```

**Note:** Since `useUpdatePlayer` already exists in `usePlayers.ts`, consider exporting it and reusing, or create a dedicated `usePlayer.ts` that imports and wraps it. Simpler: add `usePlayer(id)` to `usePlayers.ts` file (no new file needed for this hook).

#### Step 1.2: `usePlayerMatches.ts`

```typescript
const PAGE_SIZE = 10
const PLAYER_MATCHES_KEY = 'player-matches'

export function usePlayerMatches(playerId: string, page: number) {
  return useQuery({
    queryKey: [PLAYER_MATCHES_KEY, playerId, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      // First: get all match IDs this player participated in
      const { data: participations, error: pError } = await supabase
        .from('match_participants')
        .select('match_id')
        .eq('player_id', playerId)
        .order('match_id')

      if (pError) throw pError
      if (!participations?.length) return { matches: [], hasMore: false }

      const matchIds = participations.map(p => p.match_id)

      // Then: fetch match details with pagination
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          teams:match_teams(*),
          participants:match_participants(*, player:players(*)),
          scores:match_scores(*)
        `)
        .in('id', matchIds)
        .order('played_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const matches = (data ?? []).map((m) => ({
        ...(m as Match),
        teams: (m.teams ?? []) as MatchTeam[],
        participants: (m.participants ?? []) as (MatchParticipant & { player: Player })[],
        scores: ((m.scores ?? []) as MatchScore[]).sort((a, b) => a.set_number - b.set_number),
      })) as MatchWithDetails[]

      return { matches, hasMore: matches.length === PAGE_SIZE }
    },
    enabled: !!playerId,
  })
}
```

**Alternative approach (more efficient):** Use a Supabase RPC or join query. But the two-step approach above is simple and leverages existing patterns. If performance becomes an issue with many matches, optimize later (YAGNI).

**Even simpler:** Since `useMatches()` already fetches ALL matches with full details, and the app likely has <1000 matches total, we could filter client-side. But for infinite scroll, server-side pagination is cleaner. Use the two-step approach.

**Refined approach using subquery:**

```typescript
const { data, error } = await supabase
  .from('matches')
  .select(`
    *,
    teams:match_teams(*),
    participants:match_participants!inner(*, player:players(*)),
    scores:match_scores(*)
  `)
  .eq('match_participants.player_id', playerId)
  .order('played_at', { ascending: false })
  .range(from, to)
```

This uses the `!inner` join to filter matches where the player is a participant. Much cleaner - single query.

#### Step 1.3: `useBestPartner.ts`

```typescript
const DOUBLES_TYPES = ['MEN_DOUBLES', 'WOMEN_DOUBLES', 'MIXED_DOUBLES']

export interface BestPartnerResult {
  partner: Player | null
  winRate: number
  totalMatches: number
  wins: number
}

export function useBestPartner(playerId: string) {
  const { data: matches, isLoading } = useMatches() // All matches - we need full history

  const result = useMemo<BestPartnerResult>(() => {
    if (!matches || !playerId) {
      return { partner: null, winRate: 0, totalMatches: 0, wins: 0 }
    }

    // Filter to doubles matches where this player participated
    const playerMatches = matches.filter((m) => {
      if (!DOUBLES_TYPES.includes(m.match_type)) return false
      return m.participants.some((p) => p.player_id === playerId)
    })

    if (playerMatches.length === 0) {
      return { partner: null, winRate: 0, totalMatches: 0, wins: 0 }
    }

    // For each match, find the player's team and teammate
    const teammateStats = new Map<string, { total: number; wins: number; player: Player }>()

    for (const match of playerMatches) {
      const playerParticipant = match.participants.find((p) => p.player_id === playerId)
      if (!playerParticipant) continue

      const playerTeamId = playerParticipant.team_id
      const isWinner = match.teams.find((t) => t.id === playerTeamId)?.is_winner ?? false

      // Find teammate(s) on same team
      const teammates = match.participants.filter(
        (p) => p.team_id === playerTeamId && p.player_id !== playerId
      )

      for (const teammate of teammates) {
        const stats = teammateStats.get(teammate.player_id)
        if (stats) {
          stats.total += 1
          if (isWinner) stats.wins += 1
        } else {
          teammateStats.set(teammate.player_id, {
            total: 1,
            wins: isWinner ? 1 : 0,
            player: teammate.player,
          })
        }
      }
    }

    if (teammateStats.size === 0) {
      return { partner: null, winRate: 0, totalMatches: 0, wins: 0 }
    }

    // Sort by win rate desc, then wins desc
    const sorted = Array.from(teammateStats.values()).sort((a, b) => {
      const rateA = a.total > 0 ? a.wins / a.total : 0
      const rateB = b.total > 0 ? b.wins / b.total : 0
      if (rateB !== rateA) return rateB - rateA
      return b.wins - a.wins
    })

    const best = sorted[0]
    return {
      partner: best.player,
      winRate: best.total > 0 ? best.wins / best.total : 0,
      totalMatches: best.total,
      wins: best.wins,
    }
  }, [matches, playerId])

  return { ...result, isLoading }
}
```

**Note:** `useMatches()` fetches ALL matches. For the best partner calculation we need the full history anyway (not paginated). This is acceptable since the dataset is small. If it grows large, we can add a dedicated Supabase query later.

### Phase 2: Page Component

#### Step 2.1: `PlayerDetailPage.tsx`

Structure:

```
PlayerDetailPage
├── Header section (avatar + name)
│   ├── Avatar (tappable -> AvatarPicker)
│   └── Name (inline editable)
├── Stats row (4 cards)
│   ├── Matches
│   ├── Wins
│   ├── Losses
│   └── Donated
├── Best Partner card
└── Match History (infinite scroll)
    └── MatchCard (simplified or full)
```

**Key implementation details:**

1. **Avatar editing:** Reuse `AvatarPicker` component. On select/upload/remove, call existing mutations from `useAvatarUpload.ts`.

2. **Name editing:** Use a local `isEditingName` state. Show `<input>` when editing, `<span>` when not. Save on blur or Enter key. Use `useUpdatePlayer` mutation.

3. **Stats:** Derive from `usePlayerStats()` which already computes matchesPlayed/wins/losses for all players. Filter to current player. Or compute from `usePlayerMatches` data. Simpler: use `usePlayerStats()` and filter.

4. **Match History Infinite Scroll:** Use `usePlayerMatches` with page state. Use `IntersectionObserver` (native API, no extra lib needed) to detect when user scrolls to bottom, then increment page. Use `useEffect` to accumulate matches across pages.

   ```typescript
   const [page, setPage] = useState(0)
   const [allMatches, setAllMatches] = useState<MatchWithDetails[]>([])
   const { data, isLoading, isFetching } = usePlayerMatches(playerId, page)

   useEffect(() => {
     if (data?.matches) {
       setAllMatches(prev => page === 0 ? data.matches : [...prev, ...data.matches])
     }
   }, [data, page])
   ```

5. **IntersectionObserver setup:**
   ```typescript
   const observerRef = useRef<IntersectionObserver | null>(null)
   const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
     if (isFetching || !data?.hasMore) return
     if (observerRef.current) observerRef.current.disconnect()
     observerRef.current = new IntersectionObserver((entries) => {
       if (entries[0].isIntersecting) {
         setPage(p => p + 1)
       }
     })
     if (node) observerRef.current.observe(node)
   }, [isFetching, data?.hasMore])
   ```

6. **MatchCard usage:** The existing `MatchCard` component expects `matchNumber`, swipe handlers, etc. For the player detail page, we can either:
   - Use `MatchCard` with dummy swipe handlers (no delete on player page)
   - Create a simplified `PlayerMatchCard` component
   
   **Decision:** Use `MatchCard` but disable swipe/delete. Add a `readonly` or `hideActions` prop. Or simpler: create a small `CompactMatchCard` component that shows match info without swipe. Let's create `CompactMatchCard` to keep concerns separate.

   Actually, looking at MatchCard - it has swipe-to-delete baked in. For player detail page we don't want delete. Better to extract a read-only match display or add a prop. For simplicity and following the <200 line rule, create `CompactMatchCard.tsx`.

### Phase 3: Navigation Integration

#### Step 3.1: `AnimatedRoutes.tsx`

Add route:
```typescript
{ path: '/players/:playerId', element: <PlayerDetailPage />, auth: true }
```

#### Step 3.2: `PlayersPage.tsx`

Modify `SwipePlayerItem` to support navigation. The current structure has swipe-to-delete on the whole card. We need:
- Tap on the content area -> navigate to detail
- Tap on avatar -> edit avatar (existing)
- Swipe -> delete (existing)

Change the `onClick` handler on the foreground div:
```typescript
onClick={() => {
  if (isOpen) {
    setTranslateX(0)
    onClose()
  } else {
    onNavigate() // NEW
  }
}}
```

Add `onNavigate` prop to `SwipePlayerItem` and pass `() => navigate(`/players/${player.id}`)` from parent.

**Important:** The avatar button's `onClick` must call `e.stopPropagation()` to prevent navigation when tapping avatar.

#### Step 3.3: `App.tsx`

Add to `getPageTitle`:
```typescript
if (path.startsWith('/players/') && path !== '/players') return 'Player Detail'
```

The AppBar back button will automatically work (it uses `navigate(-1)` for non-special routes).

### Phase 4: Tests

#### Step 4.1: Update `navigation.test.tsx`

Add `/players/:playerId` to:
1. `nonTabRoutes` array (tab bar should hide)
2. AppBar test cases - should show app bar with title "Player Detail"
3. Route matching tests

---

## TODO Checklist

### Phase 1: Hooks
- [x] Add `usePlayer(id)` query to `src/hooks/usePlayers.ts`
- [x] Create `src/hooks/usePlayerMatches.ts` with paginated Supabase query
- [x] Create `src/hooks/useBestPartner.ts` with doubles-only partner computation

### Phase 2: Components
- [x] Create `src/components/CompactMatchCard.tsx` (read-only match display) - **Note: Used existing MatchCard instead**
- [x] Create `src/pages/PlayerDetailPage.tsx` with all sections

### Phase 3: Navigation & Integration
- [x] Add `/players/:playerId` route to `src/components/AnimatedRoutes.tsx`
- [x] Update `src/pages/PlayersPage.tsx` - make items tappable, avatar edit stops propagation
- [x] Update `src/App.tsx` - add page title mapping
- [x] Update `src/components/__tests__/navigation.test.tsx` - add new route to tests

### Phase 4: Polish
- [x] Run `npm run lint` and fix issues
- [x] Run `npm run test` and fix failures
- [x] Manual QA: test navigation, avatar edit, name edit, infinite scroll

---

## Success Criteria

- [x] Tapping a player on `/players` navigates to `/players/:playerId`
- [x] Player detail page shows avatar, name, stats, best partner, match history
- [x] Avatar is tappable and opens AvatarPicker; changes persist
- [x] Name is editable inline; changes persist and reflect immediately
- [x] Stats (matches, wins, losses, donated) are accurate
- [x] Best partner shows correct partner with win rate for doubles matches only
- [x] Match history loads in batches of ~10; scrolling loads more
- [x] Back button returns to `/players`
- [x] All existing tests pass; navigation tests cover new route
- [x] No TypeScript errors; lint passes

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Swipe-to-delete conflicts with tap-to-navigate | Medium | Ensure avatar button stops propagation; swipe state prevents nav |
| `useMatches()` loading all matches becomes slow | Low | Dataset is small; optimize with dedicated query if needed later |
| Infinite scroll triggers too aggressively | Low | Use IntersectionObserver with rootMargin; test on device |
| Name edit UX feels clunky | Low | Save on blur + Enter; show loading state during mutation |

---

## Unresolved Questions

1. Should the match history show a simplified card or the full MatchCard? (Plan proposes CompactMatchCard for read-only display.)
2. Should we show a "no best partner yet" state for players with only singles matches? (Yes - show a friendly empty state.)
3. Should match history be ordered by `played_at` or `created_at`? (Use `played_at desc` to match `useMatches` pattern.)
