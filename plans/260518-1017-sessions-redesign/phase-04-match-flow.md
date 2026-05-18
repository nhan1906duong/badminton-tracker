# Phase 04 — Match Create + Edit (Scoped to Session)

## Player selection flow

Player list is filtered by session's `activePlayers` store (if any are selected). If no active players set, show all global players (same as today, but still scoped inside the session page).

## `src/pages/SessionMatchPlayersPage.tsx` — `/sessions/:id/matches/new`

- Same UX as today's `SelectPlayersPage`.
- URL params: `:id` = sessionId.
- Reads session from `useMatch(id)` (for title display), but only needs `sessionId` for create.
- "Next" → navigate to `/sessions/:id/matches/new/result`.
- `useNewMatchStore` still used for local match-flow state.

## `src/pages/SessionMatchResultPage.tsx` — `/sessions/:id/matches/new/result`

- Same UX as today's `FinalResultPage`.
- Extract `sessionId` from URL params.
- On save: `useCreateMatch` now sends `session_id`.
- On success: `reset()` store, navigate to `/sessions/:id` (session detail).

## `src/pages/EditMatchPage.tsx` — `/sessions/:id/matches/:matchId/edit`

- Load match via `useMatch(matchId)`.
- Show team matchup (read-only — changing players after creation = edge case, skip for now).
- Editable: set scores (same ScoreEntry component), winner toggle.
- "Save Changes" → `useUpdateMatch` mutation.
- On success → navigate back to `/sessions/:id`.

## Removed pages
- Delete `src/pages/SelectPlayersPage.tsx` (replaced by `SessionMatchPlayersPage`).
- Delete `src/pages/FinalResultPage.tsx` (replaced by `SessionMatchResultPage`).
- Delete `src/pages/MatchDetailPage.tsx` (functionality merged into `EditMatchPage`).
