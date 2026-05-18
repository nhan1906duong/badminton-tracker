# Phase 03 — Session Pages

## `src/pages/SessionsListPage.tsx` — `/sessions`

- List of all sessions (label + date range).
- Tap a session → navigate to `/sessions/:id`.
- Floating FAB → navigate to `/sessions/new`.
- Empty state: "No sessions yet. Tap + to start one."

## `src/pages/CreateSessionPage.tsx` — `/sessions/new`

- Optional label input (text). If left blank, auto-fill with formatted date e.g. "Friday, May 18".
- "Start Session" button → `useCreateSession` mutation (auto-closes prior open session).
- On success → navigate to `/sessions/active` (or directly to the session detail of the new session).

## `src/pages/SessionDetailPage.tsx` — `/sessions/:id`

Two sections:

### Section A: Active Players (local filter)
- "Who's playing today?" heading.
- Show all global players as toggle chips. Active ones highlighted.
- State lives in `sessionStore` (localStorage), keyed by `sessionId`.
- "Select all active players" quick toggle if none selected.

### Section B: Matches in this session
- List of matches in reverse chronological order.
- Each row: team A vs team B, winner indicator, maybe set scores summary.
- Actions on each match:
  - Tap → navigate to `/sessions/:id/matches/:matchId/edit` (edit page).
  - Swipe/long-press → delete (useDeleteMatch).
- "Add Match" button → navigate to `/sessions/:id/matches/new`.
- If session is still open, show "End Session" button in top-right area.

## Route: `/sessions/active` (resolver)
- Query `useOpenSession()`:
  - If open session exists → replace navigate to `/sessions/:id` for that session.
  - If none → replace navigate to `/sessions/new`.
- This is the entry point when user taps bottom-nav "Match".
