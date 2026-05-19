# Phase 03 — Donation panel in SessionDetailPage

## Context

- `SessionDetailPage.tsx` currently: Active Players → Matches sections.
- Phase 01 ships `useSessionDonationStats`.
- Phase 02 ships `/sessions/:id/donated` route.

## Overview

- Priority: High (delivers the user-facing feature)
- Status: pending

Insert a "Total Donated" tappable panel between Active Players and Matches. Hide entirely when 0 losses.

## Key Insights

- Page is currently 137 LOC; adding panel ≈ +35 LOC → still < 200.
- Reuse the same card recipe HomePage uses (`bg-white rounded-2xl border border-gray-100 p-4`).
- Add a `ChevronRight` affordance to signal tappable.
- `active:scale-[0.98] transition-transform` for press feedback (matches HomePage Active Session card).

## Requirements

**Functional:**
- Render between Active Players (`<section>`) and Matches (`<section>`).
- Hidden when `totalLosses === 0` (per user choice).
- Layout (when visible):
  ```
  [TrendingUp]  TOTAL DONATED                                [›]
  30.000 VND   <— text-2xl font-bold text-yellow-500
  6 losses × 5.000 VND
  ```
- Tap → `navigate(`/sessions/${sid}/donated`)`.
- Loading state: skip render (no skeleton); avoids flicker since data is cheap.

**Non-functional:**
- No new component file (inline in page, per HomePage precedent).
- Final LOC ≤ 200.

## Architecture

```
SessionDetailPage
  ├─ useSessionDonationStats(sid) ← new
  ├─ <section>Active Players</section>
  ├─ {totalLosses > 0 && <DonationPanel />}   ← new
  └─ <section>Matches</section>
```

## Related Code Files

- Modify: `src/pages/SessionDetailPage.tsx`

## Implementation Steps

1. Import additions at top of `SessionDetailPage.tsx`:
   ```ts
   import { Plus, Users, Trophy, X, TrendingUp, ChevronRight } from 'lucide-react'
   import { useSessionDonationStats } from '../hooks/usePlayerStats'
   import { formatCurrency, LOSS_PENALTY_VND } from '../lib/currency'
   ```
2. Inside component body, after existing hooks:
   ```ts
   const { totalLosses, totalDonatedVnd } = useSessionDonationStats(sid)
   ```
3. Render between Active Players section and Matches section:
   ```tsx
   {totalLosses > 0 && (
     <section>
       <button
         onClick={() => navigate(`/sessions/${sid}/donated`)}
         className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 active:scale-[0.98] transition-transform"
       >
         <div className="flex items-start justify-between gap-3">
           <div className="space-y-1">
             <div className="flex items-center gap-2 text-gray-400">
               <TrendingUp className="w-4 h-4" />
               <span className="text-xs font-semibold uppercase tracking-wide">
                 Total Donated
               </span>
             </div>
             <p className="text-2xl font-bold text-yellow-500">
               {formatCurrency(totalDonatedVnd)}
             </p>
             <p className="text-xs text-gray-400">
               {totalLosses} losses × {formatCurrency(LOSS_PENALTY_VND)}
             </p>
           </div>
           <ChevronRight className="w-5 h-5 text-gray-300 mt-0.5 shrink-0" />
         </div>
       </button>
     </section>
   )}
   ```
4. Run `npx tsc --noEmit` + `npm run build` (smoke).
5. Manual visual check in dev server (`npm run dev`).

## Todo List

- [ ] Wire `useSessionDonationStats(sid)` in SessionDetailPage
- [ ] Add donation panel JSX between Active Players & Matches
- [ ] Hide panel when totalLosses === 0
- [ ] Verify tap → navigates to /sessions/{id}/donated
- [ ] Visual check: yellow currency renders correctly
- [ ] Type-check & build clean

## Success Criteria

- Session with ≥1 loss shows donation panel between Active Players and Matches.
- Tap navigates to donated list page.
- Session with 0 losses renders identical to current behaviour (panel absent).
- Yellow color matches design (`text-yellow-500`).

## Risk Assessment

- **Risk:** LOC over 200. **Mitigation:** Panel is small (≈35 lines). Should land ~172 LOC. Re-evaluate extraction only if it exceeds 200.
- **Risk:** `useSessionDonationStats` reuses `usePlayers()` and `useMatches(sessionId)` — already fetched by other parts of the page, so TanStack Query dedups. No extra requests.

## Security Considerations

None — read-side.

## Next Steps

→ Phase 04 docs sync.
