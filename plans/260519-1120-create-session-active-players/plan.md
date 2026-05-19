# Create-Session Active Players — Plan Overview

Let user pick active players when creating a session. Default-select top 5 most-joined players. Chip + bottom-sheet pattern, lazy-loaded list (handles huge rosters). Replace SessionDetailPage's existing chip grid with same shared component.

## Design Decisions

| Question | Answer |
|----------|--------|
| Scope | Shared component used in both **CreateSessionPage** and **SessionDetailPage**. |
| Default selection | Top 5 by `matchesPlayed` desc, tie-break by name asc. If <5 players in DB → all of them. |
| Bottom-sheet selector | iOS-style **circle indicator multi-select** (filled green = picked). |
| Virtualization | `@tanstack/react-virtual` (same family as react-query). |
| Persistence | CreateSessionPage uses local React state; on Start commits to `useSessionStore.setPlayers(newSessionId, ids)`. SessionDetailPage edits session-store directly. |
| Chip toggle behavior | Tapping a chip **removes** the player from active set (per spec). |
| Bottom-sheet filter | Hides players already in the chip set; shows only "addable" players. |

## Phases

| # | Phase | Status | Files |
|---|-------|--------|-------|
| 1 | [Deps + top-joined hook](./phase-01-deps-and-top-joined-hook.md) | ✅ Done | `package.json`, `src/hooks/useTopJoinedPlayers.ts` |
| 2 | [Bottom sheet component](./phase-02-active-players-bottom-sheet.md) | ✅ Done | `src/components/ActivePlayersBottomSheet.tsx` (141 LOC) |
| 3 | [Editor component](./phase-03-active-players-editor.md) | ✅ Done | `src/components/ActivePlayersEditor.tsx` (96 LOC) |
| 4 | [CreateSessionPage integration](./phase-04-create-session-page.md) | ✅ Done | `src/pages/CreateSessionPage.tsx` (104 LOC) |
| 5 | [SessionDetailPage migration](./phase-05-session-detail-page.md) | ✅ Done | `src/pages/SessionDetailPage.tsx` (137 LOC) |
| 6 | [Docs update](./phase-06-docs.md) | ✅ Done | `docs/codebase-summary.md`, `docs/design-guidelines.md`, `docs/project-roadmap.md` |

## Dependencies

- Phase 1 unlocks all others (adds dep + hook).
- Phases 2 → 3 (Editor uses BottomSheet).
- Phases 4 & 5 depend on 3.
- Phase 6 last.
