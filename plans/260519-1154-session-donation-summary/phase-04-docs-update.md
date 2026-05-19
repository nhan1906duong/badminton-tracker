# Phase 04 — Docs update

## Context

`docs/codebase-summary.md` is the file-map source of truth referenced by the team.

## Overview

- Priority: Low (after implementation)
- Status: pending

## Requirements

Update `docs/codebase-summary.md`:

1. Add new file rows to "Key Files (LOC)" table (estimated LOC, fill in real after impl):
   - `pages/SessionDonatedListPage.tsx`
   - `lib/currency.ts`
2. Update existing rows that changed LOC after edits:
   - `pages/SessionDetailPage.tsx`
   - `pages/HomePage.tsx`
   - `hooks/usePlayerStats.ts`
3. Append `SessionDonatedListPage.tsx` to the "Pages" tree block (`/sessions/:id/donated`).
4. Append `lib/currency.ts` to the "Lib" tree block.
5. Append a short section after "Active Players Selection":
   ```
   ## Session Donations

   Each loss = 5,000 VND penalty (`LOSS_PENALTY_VND` in `lib/currency.ts`).
   `useSessionDonationStats(sessionId)` aggregates loss counts and total donated.
   SessionDetailPage shows a "Total Donated" panel (hidden when 0 losses);
   tapping navigates to `/sessions/:id/donated` — a sorted donor list.
   ```

## Related Code Files

- Modify: `docs/codebase-summary.md`

## Implementation Steps

1. After phase 1–3 land, measure LOC with `wc -l src/pages/SessionDetailPage.tsx src/pages/HomePage.tsx src/pages/SessionDonatedListPage.tsx src/hooks/usePlayerStats.ts src/lib/currency.ts`.
2. Patch the table + tree + new section in `codebase-summary.md`.
3. No code changes — markdown only.

## Todo List

- [ ] Measure final LOC
- [ ] Add rows to Key Files table
- [ ] Add new entries to Pages + Lib trees
- [ ] Append "Session Donations" section
- [ ] Verify markdown renders cleanly

## Success Criteria

`docs/codebase-summary.md` accurately reflects post-feature state with no stale LOC.

## Risk Assessment

Trivial — doc-only.

## Security Considerations

None.

## Next Steps

End of plan. Commit with conventional message (`feat(session): add donation summary panel + donated list page`).
