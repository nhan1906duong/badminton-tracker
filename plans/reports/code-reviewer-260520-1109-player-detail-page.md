# Code Review: Player Detail Page

## Scope
- **Files**: 9 (3 new, 6 modified)
- **New**: `usePlayerMatches.ts`, `useBestPartner.ts`, `PlayerDetailPage.tsx`
- **Modified**: `usePlayers.ts`, `AnimatedRoutes.tsx`, `PlayersPage.tsx`, `App.tsx`, `navigation.test.tsx`, `test/utils.tsx`
- **Focus**: Full implementation review

## Overall Assessment
Solid implementation with good TanStack Query patterns, clean component structure, and proper TypeScript usage. A few medium-priority issues around data loading strategy, query invalidation, and edge case handling. No critical security vulnerabilities. Score: **7.5/10**.

---

## Critical Issues

None.

---

## High Priority

### 1. `useBestPartner` fetches ALL matches unnecessarily
**File**: `src/hooks/useBestPartner.ts`

`useBestPartner` calls `useMatches()` with no `sessionId`, which fetches every match in the database. For a player detail page showing one player's stats, this is wasteful. The hook computes best partner from all historical matches — if the intent is global best partner, this is correct but should be documented. If session-scoped, pass `sessionId`.

**Impact**: Unnecessary data transfer, slower page load as match count grows.

**Fix**: Add JSDoc clarifying scope. If global is intended, consider caching or a dedicated API. If session-scoped, accept `sessionId` param.

### 2. Missing query invalidation for `usePlayer` after mutations
**File**: `src/hooks/usePlayers.ts`

`useUpdatePlayer`, `useAvatarUpload`, `useSetDefaultAvatar`, `useAvatarDelete` all invalidate `['players']` but NOT `['players', id]`. The `usePlayer(id)` query on the detail page won't refresh after name/avatar changes.

**Impact**: Stale data on player detail page after edits.

**Fix**: Add `qc.invalidateQueries({ queryKey: [PLAYERS_KEY, player.id] })` in `useUpdatePlayer.onSuccess`. Avatar hooks should also invalidate the specific player key.

```ts
// In useUpdatePlayer
onSuccess: (_, vars) => {
  qc.invalidateQueries({ queryKey: [PLAYERS_KEY] })
  qc.invalidateQueries({ queryKey: [PLAYERS_KEY, vars.id] })
},
```

### 3. `usePlayerMatches` does not invalidate on match creation/deletion
**File**: `src/hooks/usePlayerMatches.ts`

The `PLAYER_MATCHES_KEY` is not invalidated by `useCreateMatch` or `useDeleteMatch` in `useMatches.ts`. After adding/deleting a match, the player's match history on the detail page stays stale.

**Impact**: User sees outdated match history after creating or deleting matches.

**Fix**: In `useCreateMatch` and `useDeleteMatch` `onSuccess`, add:
```ts
qc.invalidateQueries({ queryKey: ['player-matches'] })
```

---

## Medium Priority

### 4. `useBestPartner` tie-breaker is insufficient
**File**: `src/hooks/useBestPartner.ts:63-68`

When two partners have identical win rates AND identical win counts, the sort is unstable (order depends on Map insertion). This can cause the "best partner" to flicker between two candidates on re-renders.

**Impact**: UI inconsistency — best partner may change on page refresh.

**Fix**: Add a third tie-breaker (total matches desc, or player name):
```ts
if (rateB !== rateA) return rateB - rateA
if (b.wins !== a.wins) return b.wins - a.wins
return b.total - a.total // or a.player.name.localeCompare(b.player.name)
```

### 5. `usePlayerMatches` Supabase query may return duplicates across pages
**File**: `src/hooks/usePlayerMatches.ts`

Pagination uses `range(from, to)` with `order('played_at', { ascending: false })`. If two matches have identical `played_at` timestamps, their sort order is non-deterministic. A match could appear on both page N and page N+1, or be skipped.

**Impact**: Duplicate or missing matches in infinite scroll.

**Fix**: Add a secondary sort on `id` (or `created_at`) to guarantee stable ordering:
```ts
.order('played_at', { ascending: false })
.order('id', { ascending: false })
```

### 6. `CompactMatchCard` key uses array index for scores
**File**: `src/pages/PlayerDetailPage.tsx:52-56`

```tsx
{match.scores.map((s, i) => (
  <p key={i} className="...">
```

Using array index as React key is acceptable here since scores are append-only and ordered by `set_number`, but `key={s.id}` or `key={s.set_number}` is safer.

### 7. Name edit does not trim on blur
**File**: `src/pages/PlayerDetailPage.tsx:127-132`

```tsx
const handleSaveName = () => {
  if (player && editName.trim() && editName.trim() !== player.name) {
    updatePlayer.mutate({ id: player.id, name: editName.trim() })
  }
  setIsEditingName(false)
}
```

If `editName` is whitespace-only, the edit silently cancels (good). But if `editName.trim() !== player.name` is false (e.g. adding trailing space to same name), it also silently cancels without feedback. Minor UX issue.

### 8. `handleKeyDown` missing `useCallback`
**File**: `src/pages/PlayerDetailPage.tsx:134-137`

```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
```

This function is recreated every render and passed to `<input onKeyDown>`. Should use `useCallback`.

### 9. `usePlayer` returns typed `Player` but Supabase may return `null`
**File**: `src/hooks/usePlayers.ts:21-35`

```ts
return useQuery({
  queryKey: [PLAYERS_KEY, id],
  queryFn: async () => {
    const { data, error } = await supabase.from('players').select('*').eq('id', id).single()
    if (error) throw error
    return data as Player  // data could be null if .single() returns nothing
  },
})
```

If the player is deleted between navigation and render, `.single()` throws `PGRST116` (no rows), which is caught and thrown. The query goes to error state. `PlayerDetailPage` handles `!player` but not the error state — it shows "Player not found" only when data is null, not when the query errors.

**Impact**: Uncaught error UI if player deleted while on detail page.

**Fix**: In `PlayerDetailPage`, also handle `isError` state from `usePlayer`.

---

## Low Priority

### 10. `loadMoreRef` callback creates new `IntersectionObserver` on every dependency change
**File**: `src/pages/PlayerDetailPage.tsx:109-118`

The callback disconnects and recreates the observer whenever `isFetchingNextPage`, `hasNextPage`, or `fetchNextPage` changes. This is correct but slightly wasteful. Could use a ref for `fetchNextPage` to reduce churn.

### 11. Missing `isError` / `error` display for `usePlayerMatches`
**File**: `src/pages/PlayerDetailPage.tsx`

If match history query fails, the UI shows "Loading matches..." forever (no error state). Should show an error message or retry button.

### 12. `PlayerDetailPage` is 278 lines — approaching modularization threshold
**File**: `src/pages/PlayerDetailPage.tsx`

Per project conventions (200-line limit), consider extracting `CompactMatchCard` and `StatCard` to separate files.

### 13. `useBestPartner` has no minimum match threshold
A partner with 1 win out of 1 match (100% win rate) beats a partner with 19 wins out of 20 (95%). Consider requiring minimum 3+ matches for "best partner" to be meaningful.

---

## Edge Cases Found by Scout

1. **Player deleted while viewing detail page**: `usePlayer` throws, page shows spinner forever (no error UI).
2. **Empty playerId in URL**: `useParams` returns `undefined`, `id` becomes `''`, `enabled: !!id` disables query, page shows "Player not found" (correct).
3. **Match with no winner**: `CompactMatchCard` computes `playerWon` as `playerTeamLabel === winnerLabel`. If no winner, `winnerLabel` is `undefined`, `playerWon` is `false`, shows "Loss" (debatable — should show "No result" or omit).
4. **Doubles match with >2 participants per team**: `useBestPartner` iterates all teammates on the same team. If data is corrupted (3+ per team), all are counted. Acceptable defensive coding gap.
5. **Two partners with identical stats**: Sort instability causes non-deterministic "best partner" (see #4).
6. **Identical `played_at` timestamps across pages**: Can cause duplicate/missing matches in infinite scroll (see #5).
7. **Avatar upload failure during picker open**: No error state shown in `AvatarPicker` — mutation error is unhandled in UI.

---

## Positive Observations

- Good use of `useInfiniteQuery` for paginated match history with proper `IntersectionObserver` sentinel
- `enabled: !!id` guards prevent invalid queries
- `useMemo` used appropriately for `allMatches` and `useBestPartner` computation
- `stopPropagation` correctly prevents avatar edit from triggering player navigation
- Tests updated for new route in both `navigation.test.tsx` and `test/utils.tsx`
- `usePlayer` hook follows existing pattern in `usePlayers.ts`
- TypeScript types are consistent with existing codebase
- AppBar title and tab bar visibility correctly handled for new route

---

## Recommended Actions (Prioritized)

1. **Fix query invalidation** (#2, #3): Add `['players', id]` and `['player-matches']` to mutation `onSuccess` handlers
2. **Stabilize `useBestPartner` sort** (#4): Add third tie-breaker
3. **Fix `usePlayerMatches` ordering** (#5): Add secondary `.order('id')`
4. **Add error states** (#9, #11): Handle `isError` for `usePlayer` and `usePlayerMatches`
5. **Wrap handlers in `useCallback`** (#8): `handleKeyDown`, `handleStartEditName`, `handleSaveName`
6. **Document `useBestPartner` scope** (#1): Add JSDoc clarifying global vs session scope
7. **Modularize** (#12): Extract `CompactMatchCard` and `StatCard` to separate files

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | Pass (`tsc --noEmit` clean) |
| Lint (new code) | Clean (0 new issues) |
| Tests | 19/19 pass |
| Test Coverage | Route + navigation tests added |
| New Files | 3 |
| Lines Added (approx) | ~350 |

## Unresolved Questions

1. Should `useBestPartner` be global (all time) or session-scoped? Current implementation is global.
2. Should there be a minimum match threshold for "best partner" eligibility?
3. How should matches with no winner be displayed in the match history card?
