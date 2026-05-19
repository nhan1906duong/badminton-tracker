# Phase 01 — Session-scoped player stats hook

## Context

- Existing `src/hooks/usePlayerStats.ts` (76 LOC) aggregates losses across ALL matches.
- `useMatches(sessionId?)` already supports session filtering.

## Overview

- Priority: High (blocks phase 2 & 3)
- Status: pending

Extend `usePlayerStats` to accept an optional `sessionId`. Pass it into `useMatches(sessionId)`. No other behaviour change. Backward compatible.

Also extract currency helper to a new shared file so HomePage + new code DRY.

## Key Insights

- `useMatches(sessionId)` already filters server-side via `.eq('session_id', sessionId)`.
- All downstream consumers of `usePlayerStats()` (HomePage, PlayersPage) call it with no args — adding an optional param is safe.
- `lib/match-helpers.ts` exists for similar utility patterns.

## Requirements

**Functional:**
- `usePlayerStats(sessionId?)` returns the same shape, but counts only matches in that session when `sessionId` is provided.
- `totalLost` reflects scoped losses.
- `useSessionDonationStats(sessionId)` (convenience wrapper) returns:
  - `totalLosses: number`
  - `totalDonatedVnd: number` (= `totalLosses * 5000`)
  - `donors: PlayerStats[]` (filter `losses > 0`, sort desc by losses; players collection re-joined for avatar)
- Shared `formatCurrency(vnd)` + `LOSS_PENALTY_VND = 5000` in `src/lib/currency.ts`.

**Non-functional:**
- Backward compatible — no breaking change in existing callers.

## Related Code Files

- Modify: `src/hooks/usePlayerStats.ts`
- Create: `src/lib/currency.ts`
- Modify: `src/pages/HomePage.tsx` (swap inline `formatCurrency` → `lib/currency.ts` import)

## Implementation Steps

1. Create `src/lib/currency.ts`:
   ```ts
   export const LOSS_PENALTY_VND = 5000

   export function formatCurrency(vnd: number): string {
     return new Intl.NumberFormat('vi-VN').format(vnd) + ' VND'
   }
   ```
2. Edit `src/hooks/usePlayerStats.ts`:
   - Signature: `export function usePlayerStats(sessionId?: string)`.
   - `useMatches(sessionId)`.
3. Append donor selector in same file (keeps related logic colocated, file < 200 LOC):
   ```ts
   export function useSessionDonationStats(sessionId: string) {
     const { stats, totalLost, isLoading } = usePlayerStats(sessionId)
     const { data: players } = usePlayers()
     const avatarMap = useMemo(() => {
       const m = new Map<string, string | null>()
       players?.forEach((p) => m.set(p.id, p.avatar_url ?? null))
       return m
     }, [players])
     const donors = useMemo(
       () =>
         stats
           .filter((s) => s.losses > 0)
           .sort((a, b) => b.losses - a.losses)
           .map((s) => ({ ...s, avatarUrl: avatarMap.get(s.playerId) ?? null })),
       [stats, avatarMap],
     )
     return {
       totalLosses: totalLost,
       totalDonatedVnd: totalLost * LOSS_PENALTY_VND,
       donors,
       isLoading,
     }
   }
   ```
4. Refactor `src/pages/HomePage.tsx`:
   - Remove local `formatCurrency`.
   - Import `{ formatCurrency, LOSS_PENALTY_VND }` from `../lib/currency`.
   - Replace `* 5000` with `* LOSS_PENALTY_VND`.
5. Run `npx tsc --noEmit` (or `npm run build`) to verify no type regressions.

## Todo List

- [ ] Create `src/lib/currency.ts`
- [ ] Extend `usePlayerStats` with optional sessionId
- [ ] Add `useSessionDonationStats` wrapper
- [ ] Refactor HomePage to use shared helper + constant
- [ ] Type-check passes

## Success Criteria

- `usePlayerStats()` (no args) returns identical data to before (regression check via HomePage Total Lost number).
- `useSessionDonationStats(activeSessionId)` returns `totalDonatedVnd` matching `losses * 5000` over only that session's matches.
- TypeScript compiles cleanly.

## Risk Assessment

- **Risk:** Forgotten import update in HomePage → build error. **Mitigation:** compile check step.
- **Risk:** Player list missing while computing donors → `useSessionDonationStats` returns empty donors briefly. Acceptable; isLoading covers it.

## Security Considerations

None. Pure read-side aggregation; existing RLS already filters matches by `created_by`.

## Next Steps

→ Phase 02 (Donated list page) consumes `useSessionDonationStats`.
