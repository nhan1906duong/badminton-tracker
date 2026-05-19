# Phase 01 — Dependencies + Top-Joined Hook

## Context Links
- [plan.md](./plan.md)
- Existing usage: `src/hooks/usePlayerStats.ts` (computes `matchesPlayed` per player)

## Overview
- **Priority:** P0 — blocks all other phases
- **Status:** Pending
- Add `@tanstack/react-virtual` for list virtualization. Expose a small hook that returns the top-N players sorted by historical participation.

## Key Insights
- `usePlayerStats()` already does the heavy lifting (per-player match count). Reuse it — DO NOT re-implement aggregation.
- `sortedByMatches` exists but does NOT break ties; we need deterministic ordering for the default-select to be stable across renders.

## Requirements
- Hook: `useTopJoinedPlayers(limit: number)` → `{ players: Player[], isLoading: boolean }`
- Sort: `matchesPlayed` DESC, then `name` ASC (lowercased) as tie-break.
- If `players.length < limit` → return all available.
- Memoized result, no recompute when unrelated state changes.

## Architecture
```
useTopJoinedPlayers(5)
   ├── usePlayerStats()       # already memoized
   │     └── useMatches() + usePlayers()
   └── useMemo: stats → take top N → map back to Player[]
```

## Related Code Files
- **Create:** `src/hooks/useTopJoinedPlayers.ts`
- **Modify:** `package.json` (add dep)

## Implementation Steps

1. **Install dep**
   ```bash
   npm install @tanstack/react-virtual
   ```

2. **Create `src/hooks/useTopJoinedPlayers.ts`**
   ```ts
   import { useMemo } from 'react'
   import { usePlayerStats } from './usePlayerStats'
   import { usePlayers } from './usePlayers'
   import type { Player } from '../types/database'

   /**
    * Returns the top-N players by historical match participation.
    * Tie-break: name asc (case-insensitive). Returns all players if total < limit.
    */
   export function useTopJoinedPlayers(limit: number) {
     const { stats, isLoading: statsLoading } = usePlayerStats()
     const { data: allPlayers, isLoading: playersLoading } = usePlayers()

     const players = useMemo<Player[]>(() => {
       if (!allPlayers) return []
       const byId = new Map(allPlayers.map((p) => [p.id, p]))
       const sorted = [...stats].sort((a, b) => {
         if (b.matchesPlayed !== a.matchesPlayed) {
           return b.matchesPlayed - a.matchesPlayed
         }
         return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
       })
       const ids = sorted.slice(0, limit).map((s) => s.playerId)
       return ids.map((id) => byId.get(id)).filter((p): p is Player => !!p)
     }, [stats, allPlayers, limit])

     return { players, isLoading: statsLoading || playersLoading }
   }
   ```

3. **Run typecheck**
   ```bash
   npm run build
   ```

## Todo List
- [ ] Install `@tanstack/react-virtual`
- [ ] Create `useTopJoinedPlayers.ts`
- [ ] Verify build passes (no TS errors)

## Success Criteria
- Hook returns correctly sorted, memoized list.
- `npm run build` succeeds.
- No new lint warnings.

## Risk Assessment
- **Risk:** `usePlayerStats` returns stats for ALL players in DB (even inactive). → Acceptable; we want most-joined regardless of `is_active`.
- **Risk:** Empty DB → returns `[]`, caller must handle gracefully.

## Next Steps
- Phase 02 (bottom sheet) consumes neither hook directly, but Phase 04 will call it for defaults.
