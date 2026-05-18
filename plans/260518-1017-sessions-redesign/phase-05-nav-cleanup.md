# Phase 05 — Navigation & Cleanup

## `src/App.tsx` routes update

Replace standalone match routes with session-scoped ones:

| Path | Page | Title |
|------|------|-------|
| `/sessions` | SessionsListPage | Sessions |
| `/sessions/new` | CreateSessionPage | New Session |
| `/sessions/:id` | SessionDetailPage | Session Detail |
| `/sessions/:id/matches/new` | SessionMatchPlayersPage | Select Players |
| `/sessions/:id/matches/new/result` | SessionMatchResultPage | Final Result |
| `/sessions/:id/matches/:matchId/edit` | EditMatchPage | Edit Match |

- Remove `/matches/new`, `/matches/new/result`, `/matches/:id` (or keep `/matches/:id` as redirect to session context if needed).
- Bottom-nav "Match" tab `to` changes to `/sessions/active`.

## `src/pages/HomePage.tsx`

Optional: update home dashboard to show current open session card (with match count, time elapsed) and a quick "Record Match" button.

## Docs

- Update `docs/system-architecture.md` route table.
- Update `docs/codebase-summary.md` key-files + pages tree.
- Update `docs/project-roadmap.md` — mark new phase as In Progress.

## Cleanup

- Remove orphaned `new-match-store.ts` if not reused by session-scoped flow.
- Ensure no dead imports remain (fix any TS6133).
