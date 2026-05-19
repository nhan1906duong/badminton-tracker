# Phase 06 — Docs Update

## Context Links
- [plan.md](./plan.md)

## Overview
- **Priority:** P2
- **Status:** Pending
- Update internal docs to reflect the new component, hook, and dependency.

## Requirements
- Add new entries to `docs/codebase-summary.md`:
  - `ActivePlayersEditor` (components)
  - `ActivePlayersBottomSheet` (components)
  - `useTopJoinedPlayers` (hooks)
- Mention `@tanstack/react-virtual` dependency in `docs/system-architecture.md` if a deps section exists; otherwise add one-liner under hooks summary.
- `docs/design-guidelines.md`: append a sub-section under "Pills & Chips" for the new "Active player chip" pattern (green pill + small avatar; tap-to-remove).
- `docs/project-roadmap.md`: tick off corresponding milestone if listed, else add a "Create-session player selection" entry under completed work.

## Related Code Files
- **Modify:** `docs/codebase-summary.md`, `docs/design-guidelines.md`, `docs/project-roadmap.md`, `docs/system-architecture.md` (if applicable)

## Implementation Steps

1. **`docs/codebase-summary.md`**
   - Add LOC table rows for new files.
   - Add bullet entries in Components & Hooks sections.
   - Append a short section "Active Players Selection" describing the chip + bottom-sheet flow.

2. **`docs/design-guidelines.md`** — under Pills & Chips:
   ```md
   - **Active player chip**: `bg-green-600 text-white rounded-full pl-1 pr-3 py-1` with 24px avatar; tap-to-remove.
   - **Add player CTA (dashed)**: `border border-dashed border-gray-300` rounded-full with `+` icon.
   - **Circle indicator (multi-select)**: 24px circle; unselected `border-2 border-gray-300`, selected `bg-green-600` + white check.
   ```

3. **`docs/project-roadmap.md`** — append a line under most-recent milestone:
   ```md
   - [x] Create-session active player picker w/ top-5 default
   ```

4. **Verify build / no broken links**
   ```bash
   npm run build
   ```

## Todo List
- [ ] Update `codebase-summary.md`
- [ ] Append patterns to `design-guidelines.md`
- [ ] Mark milestone in `project-roadmap.md`
- [ ] Note dependency in `system-architecture.md` if relevant

## Success Criteria
- Docs accurately describe new files & patterns.
- No dead links in updated docs.

## Risk Assessment
- **Risk:** Minor — docs only.

## Next Steps
- Plan complete.
