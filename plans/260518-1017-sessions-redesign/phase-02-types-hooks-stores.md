# Phase 02 — Types, Hooks, Stores

## Types (`src/types/database.ts`)

- Add `Session` interface.
- Add `session_id` to `Match` and `MatchWithDetails`.

## Hooks (`src/hooks/useSessions.ts`)

- `useSessions()` — list all sessions for user, newest first.
- `useOpenSession()` — query `sessions` WHERE `ended_at IS NULL` LIMIT 1.
- `useCreateSession()` — mutation. Inside `mutationFn`: start transaction (or two calls) → close any prior open session for this user (UPDATE ended_at = now()), then INSERT new session. Returns created session.
- `useEndSession(id)` — UPDATE ended_at = now() WHERE id = ?.

## Update `src/hooks/useMatches.ts`

- `useCreateMatch()` → accept `session_id` in `CreateMatchInput`, include it in insert.
- `useUpdateMatch()` → new mutation: edit `match_type`, `played_at`, winner team flip, DELETE old scores + INSERT new scores. Returns updated match.
- `useMatches(sessionId?)` → optionally filter by session_id.

## Store (`src/stores/session-store.ts`)

Zustand, persisted to `localStorage`.

```ts
interface SessionStore {
  activePlayers: Record<string, string[]> // sessionId -> playerId[]
  togglePlayer(sessionId, playerId): void
  setPlayers(sessionId, playerId[]): void
}
```

Simple — a map of session-id → array of selected player ids. Toggling persists across page navigation and device reboot.
