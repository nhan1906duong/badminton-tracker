# Session Donation Summary

Add a "Total Donated" panel to `SessionDetailPage` between Active Players and Matches sections. Tapping opens a new "Donated" page listing every session player with ≥1 loss.

## Decisions (from validation)

- Currency text color: `text-yellow-500` (#eab308)
- Display format: `30.000 VND` via existing `Intl.NumberFormat('vi-VN')` (reuse HomePage helper)
- Empty state: **panel hidden** when session has 0 losses
- Donated list sort: losses desc

## Formula

`totalDonated = totalSessionLosses * 5000` (VND)

Mirrors HomePage's `Total Lost` card formula but session-scoped.

## Phases

| # | Title | Status |
|---|-------|--------|
| 1 | Session-scoped player stats hook | complete |
| 2 | Donated list page + route | complete |
| 3 | Donation panel integration in SessionDetailPage | complete |
| 4 | Docs update (codebase-summary) | complete |

## Key Files

- `src/hooks/usePlayerStats.ts` — extend with optional `sessionId` arg
- `src/pages/SessionDetailPage.tsx` — add panel section
- `src/pages/SessionDonatedListPage.tsx` — **NEW**
- `src/App.tsx` — register new route + page title
- `src/lib/currency.ts` — **NEW** shared `formatCurrency`, `LOSS_PENALTY_VND`
- `src/pages/HomePage.tsx` — refactor to consume shared helper
- `docs/codebase-summary.md` — update file map

## Dependencies

Phase 1 → 2 → 3 (3 needs 1's hook + 2's route). Phase 4 last.

## Risks

- `usePlayerStats` signature change must stay backward-compatible (default param undefined → ALL matches behaviour unchanged).
- Duplicate `formatCurrency` logic now between HomePage and new code → extract to `lib/currency.ts` (DRY).

## Out of Scope

- Persisting donation amounts to DB (computed client-side).
- Per-session penalty configuration (hard-coded 5,000 VND, reuses HomePage constant).
- Editing donations (read-only list).
