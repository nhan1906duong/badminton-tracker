# Phase 3 — UI Update

## PlayerDetailPage changes

**Remove:**
- `usePlayerMatchHistory` import + call
- `hasNextPage`, `fetchNextPage`, `isFetchingNextPage` state
- "Load more" button at bottom of history

**Add:**
- `usePlayerSessionStats(id)` for session list
- `expandedSessions` Set state (kept as-is)

## New component: `SessionMatchList`

Isolated component so each expanded session owns its own query lifecycle.

```tsx
function SessionMatchList({ playerId, sessionId }: { playerId: string; sessionId: string }) {
  const { data, isLoading } = usePlayerMatchesBySession(playerId, sessionId)
  // render loading skeleton or match list
}
```

Rendered inside the expanded accordion row — query fires only when the session is expanded (component mounts).

## Virtualizer

Keep `useWindowVirtualizer` on the session list. Remove the variable-height `measureElement` from expanded rows — sessions now have no inline match content in the virtualizer (matches live in `SessionMatchList` which mounts outside the virtual item's measurement scope). Use a fixed `estimateSize` for session rows.

Wait — actually, since `SessionMatchList` expands inline inside the virtual row, we still need `measureElement` on the virtual row. Keep it.
