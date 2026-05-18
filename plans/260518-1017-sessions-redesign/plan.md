# Sessions Redesign — Plan Overview

Make the app session-based: every match belongs to a playing session. One open session at a time. Local-device "active players" per session filter the new-match picker.

## Design Decisions

| Question | Answer |
|----------|--------|
| Existing matches | Wipe them. `matches.session_id` NOT NULL from day one. |
| Session lifecycle | One open session per user. Creating a new one auto-closes the previous via `ended_at`. |
| Standalone match creation | **Removed.** All matches must be inside a session. |
| Active players | Local-only (`localStorage`). No DB table. Record<`sessionId`, `Set<playerId>`>. |
| Session label | Optional free text; auto-generate as fallback (e.g. "Friday 5/18"). |

## Phases

| # | Phase | Files to Change / Create |
|---|-------|--------------------------|
| 1 | [DB migration](./phase-01-db-migration.md) | `supabase/migrations/002_sessions.sql` |
| 2 | [Types, hooks, stores](./phase-02-types-hooks-stores.md) | `src/types/database.ts`, `src/hooks/useSessions.ts`, `src/hooks/useMatches.ts`, `src/stores/session-store.ts` |
| 3 | [Session pages](./phase-03-session-pages.md) | `src/pages/SessionsListPage.tsx`, `src/pages/CreateSessionPage.tsx`, `src/pages/SessionDetailPage.tsx` |
| 4 | [Match create + edit scoped to session](./phase-04-match-flow.md) | `src/pages/SessionMatchPlayersPage.tsx`, `src/pages/SessionMatchResultPage.tsx`, `src/pages/EditMatchPage.tsx` |
| 5 | [Navigation & cleanup](./phase-05-nav-cleanup.md) | `src/App.tsx`, `src/pages/HomePage.tsx` (optional), docs updates |

## Dependencies

- Phase 1 must run first (DB migration applied).
- Phases 2–4 can be implemented in any order once migration is in place.
- Phase 5 wires everything together, must come last.
