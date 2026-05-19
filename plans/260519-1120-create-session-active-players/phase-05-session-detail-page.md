# Phase 05 — Migrate SessionDetailPage

## Context Links
- [plan.md](./plan.md)
- [Phase 03 — Editor](./phase-03-active-players-editor.md)
- Current file: `src/pages/SessionDetailPage.tsx` (191 LOC)

## Overview
- **Priority:** P1
- **Status:** Pending
- Replace the existing toggle-chip grid + "Select All/Deselect All" button with `ActivePlayersEditor`. State stays in `useSessionStore`.

## Key Insights
- Existing implementation: `selectedIds = activePlayers[sid]`; toggles via `togglePlayer`. We replace with controlled `selectedIds` + `setPlayers`.
- "Select All / Deselect All" button is being **removed** per the new design (no equivalent in spec). If needed later, can be re-added as a secondary action.
- The matches section, FAB, and delete-confirm modal stay untouched.

## Requirements
- Replace the entire `<section>` containing the Active Players header and the player-toggle grid.
- Use `useSessionStore.setPlayers(sid, ids)` as the onChange handler.
- Keep the header label and `Users` icon as-is to match existing visual hierarchy.

## Architecture
```
SessionDetailPage
├── useSessionStore.activePlayers[sid]   → selectedIds
├── useSessionStore.setPlayers           → onChange
├── usePlayers()                          → players
└── ActivePlayersEditor (replaces old grid + Select All button)
```

## Related Code Files
- **Modify:** `src/pages/SessionDetailPage.tsx`

## Implementation Steps

1. **Remove unused imports/state**
   - Delete `Check` import (no longer used in chip render).
   - Delete `togglePlayer` and `handleSelectAll` references.
   - Keep `setPlayers`.

2. **Replace Active Players section**
   ```tsx
   <section className="space-y-3">
     <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
       <Users className="w-4 h-4" />
       Active Players
     </span>
     <ActivePlayersEditor
       players={allPlayers ?? []}
       selectedIds={selectedIds}
       onChange={(ids) => setPlayers(sid, ids)}
       isLoading={!allPlayers}
     />
   </section>
   ```

3. **Imports**
   ```tsx
   import ActivePlayersEditor from '../components/ActivePlayersEditor'
   ```

4. **Run typecheck**
   ```bash
   npm run build
   ```

## Todo List
- [ ] Import `ActivePlayersEditor`
- [ ] Delete old chip grid + Select All JSX
- [ ] Delete unused `togglePlayer`, `handleSelectAll`, `allSelected`, `Check` import
- [ ] Wire `setPlayers(sid, ids)` into Editor
- [ ] Verify build

## Success Criteria
- Page renders chips matching what was set in CreateSessionPage.
- Tapping a chip removes that player from `useSessionStore`.
- Add active player flow works identically to create page.
- No leftover dead code (linter-clean).
- File size still under 200 LOC after edit.

## Risk Assessment
- **Risk:** Existing sessions without any picks (legacy state) — chips show empty + Add button. Acceptable migration UX.
- **Risk:** Removing "Select All" might surprise users. → Acceptable per design simplification.

## Next Steps
- Phase 06 updates docs.
