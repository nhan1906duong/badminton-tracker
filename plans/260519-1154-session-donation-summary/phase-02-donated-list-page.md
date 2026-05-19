# Phase 02 — Donated list page & route

## Context

- Phase 01 ships `useSessionDonationStats(sessionId)`.
- Routing lives in `src/App.tsx` with title map `PAGE_TITLES` + heuristic `getPageTitle`.

## Overview

- Priority: High (blocks phase 3 — needs route to navigate to)
- Status: pending

Create `SessionDonatedListPage.tsx` rendered at `/sessions/:id/donated`. Displays a sorted list of every player who lost at least once in the session.

## Key Insights

- `Avatar` component handles fallback (initial letter).
- Match this page's chrome with `SessionDetailPage` (same `bg-gray-50` + `px-4 py-5 pb-32`).
- Page already gets back button + title via `AppBar` if registered.
- No FAB needed (read-only list).

## Requirements

**Functional:**
- Route: `/sessions/:id/donated` (RequireAuth wrapper).
- Header: `Total Donated: X VND` summary at top (mirrors panel for context after navigation).
- List item:
  - Left: 40px Avatar + player name (`text-sm font-medium text-gray-900`).
  - Right column (right-aligned, stacked):
    - Top: `{losses} Losses` (`text-base font-bold text-yellow-500`).
    - Bottom: `{matchesPlayed} matches joined` (`text-xs text-gray-400`).
- Sort: losses desc.
- Empty state: centered icon + "No donations yet" copy (matches Players empty state).
- Loading state: same spinner skeleton as elsewhere ("Loading donations...").

**Non-functional:**
- File LOC < 200.
- No new third-party deps.

## Architecture

```
SessionDonatedListPage
  ├─ useParams → sessionId
  ├─ useSessionDonationStats(sessionId)
  │     ├─ usePlayerStats(sessionId)
  │     │     ├─ useMatches(sessionId)
  │     │     └─ usePlayers()
  │     └─ donors[], totalDonatedVnd, isLoading
  └─ render summary + list (donors map → item)
```

## Related Code Files

- Create: `src/pages/SessionDonatedListPage.tsx`
- Modify: `src/App.tsx` (route + title)

## Implementation Steps

1. Create `src/pages/SessionDonatedListPage.tsx`:
   ```tsx
   import { useParams } from 'react-router-dom'
   import Avatar from '../components/Avatar'
   import { TrendingUp } from 'lucide-react'
   import { useSessionDonationStats } from '../hooks/usePlayerStats'
   import { formatCurrency, LOSS_PENALTY_VND } from '../lib/currency'

   export default function SessionDonatedListPage() {
     const { id: sessionId } = useParams<{ id: string }>()
     const { donors, totalDonatedVnd, totalLosses, isLoading } = useSessionDonationStats(sessionId ?? '')

     if (!sessionId) return null

     return (
       <div className="min-h-svh bg-gray-50">
         <div className="px-4 py-5 space-y-4 pb-32">
           <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-1">
             <div className="flex items-center gap-2 text-gray-400 mb-1">
               <TrendingUp className="w-4 h-4" />
               <span className="text-xs font-semibold uppercase tracking-wide">Total Donated</span>
             </div>
             <p className="text-2xl font-bold text-yellow-500">{formatCurrency(totalDonatedVnd)}</p>
             <p className="text-xs text-gray-400">
               {totalLosses} losses × {formatCurrency(LOSS_PENALTY_VND)}
             </p>
           </section>

           {isLoading ? (
             <div className="text-center py-12 text-gray-400 text-sm">Loading donations...</div>
           ) : donors.length === 0 ? (
             <div className="text-center py-12">
               <TrendingUp className="w-10 h-10 mx-auto mb-2 text-gray-300" />
               <p className="text-sm text-gray-400">No donations yet.</p>
             </div>
           ) : (
             <div className="space-y-3">
               {donors.map((d) => (
                 <div
                   key={d.playerId}
                   className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3"
                 >
                   <Avatar
                     src={d.avatarUrl}
                     name={d.name}
                     size={40}
                     bgColor="#dcfce7"
                     textColor="#15803d"
                   />
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium text-gray-900 truncate">{d.name}</p>
                   </div>
                   <div className="text-right shrink-0">
                     <p className="text-base font-bold text-yellow-500 leading-tight tabular-nums">
                       {d.losses} {d.losses === 1 ? 'Loss' : 'Losses'}
                     </p>
                     <p className="text-xs text-gray-400 leading-tight">
                       {d.matchesPlayed} matches joined
                     </p>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>
       </div>
     )
   }
   ```
2. Edit `src/App.tsx`:
   - Import `SessionDonatedListPage`.
   - Add route inside the existing nested routes block:
     ```tsx
     <Route
       path="/sessions/:id/donated"
       element={<RequireAuth><SessionDonatedListPage /></RequireAuth>}
     />
     ```
   - Add title lookup in `getPageTitle`:
     ```ts
     if (path.startsWith('/sessions/') && path.endsWith('/donated')) return 'Donated'
     ```
     Insert above the generic `'/sessions/'` → `'Session Detail'` fallback.
3. Confirm `npx tsc --noEmit` clean.

## Todo List

- [ ] Create `SessionDonatedListPage.tsx`
- [ ] Register route in App.tsx
- [ ] Add "Donated" title to getPageTitle
- [ ] Verify back button works (AppBar already handles `showBack`)
- [ ] Type-check passes

## Success Criteria

- Navigating to `/sessions/{id}/donated` shows summary + sorted donor list.
- Title bar reads "Donated".
- Tapping back returns to session detail.
- Singular vs plural "Loss / Losses" rendered correctly.

## Risk Assessment

- **Risk:** Title heuristic order matters (must register `/donated` BEFORE generic session detail catch). **Mitigation:** explicit ordering in step 2.
- **Risk:** `donors` array re-creates each render → memoization already in hook (Phase 1). OK.

## Security Considerations

Read-only page. RLS already enforces match visibility per `created_by`.

## Next Steps

→ Phase 03 panel will `navigate(`/sessions/${id}/donated`)`.
