# Phase 04 — Integrate Into CreateSessionPage

## Context Links
- [plan.md](./plan.md)
- [Phase 03 — Editor](./phase-03-active-players-editor.md)
- Current file: `src/pages/CreateSessionPage.tsx` (67 LOC)
- Store: `src/stores/session-store.ts` → `useSessionStore.setPlayers(sessionId, ids)`

## Overview
- **Priority:** P0
- **Status:** Pending
- Add an "Active Players" section above existing form. Default-select top 5 most-joined. On Start, create the session, write picks into `session-store`, then navigate.

## Key Insights
- No sessionId until after `createSession.mutateAsync` resolves → use local React state for selection during draft.
- Defaults must wait for `useTopJoinedPlayers` to finish loading before populating state. Use `useEffect` that only fires once (gate with a `defaultsAppliedRef`).
- Don't block Start when 0 players selected — user may want to add them later from SessionDetailPage. Just show a soft warning if 0.

## Requirements
- Above session-label input: `Active Players` section with `ActivePlayersEditor`.
- Initial state seeded with top-5 most-joined IDs once both `useTopJoinedPlayers(5)` and `usePlayers()` finish loading.
- On Start success: `setPlayers(newSession.id, selectedIds)` BEFORE `navigate`.
- Keep existing label input + Start button.

## Architecture
```
CreateSessionPage
├── usePlayers()              → full roster (for Editor)
├── useTopJoinedPlayers(5)    → defaults
├── useCreateSession()        → mutation
├── useSessionStore           → setPlayers
└── local state:
    ├── label: string
    └── selectedIds: string[]
```

## Related Code Files
- **Modify:** `src/pages/CreateSessionPage.tsx`

## Implementation Steps

1. **Imports & hooks**
   ```tsx
   import { useEffect, useRef, useState } from 'react'
   import { usePlayers } from '../hooks/usePlayers'
   import { useTopJoinedPlayers } from '../hooks/useTopJoinedPlayers'
   import { useSessionStore } from '../stores/session-store'
   import ActivePlayersEditor from '../components/ActivePlayersEditor'
   ```

2. **State + defaults**
   ```tsx
   const { data: allPlayers, isLoading: playersLoading } = usePlayers()
   const { players: topPlayers, isLoading: topLoading } = useTopJoinedPlayers(5)
   const setSessionPlayers = useSessionStore((s) => s.setPlayers)

   const [selectedIds, setSelectedIds] = useState<string[]>([])
   const defaultsAppliedRef = useRef(false)

   useEffect(() => {
     if (defaultsAppliedRef.current) return
     if (topLoading || playersLoading) return
     setSelectedIds(topPlayers.map((p) => p.id))
     defaultsAppliedRef.current = true
   }, [topLoading, playersLoading, topPlayers])
   ```

3. **Update Start handler**
   ```tsx
   async function handleStart() {
     setError('')
     try {
       const session = await createSession.mutateAsync({
         label: label.trim() || undefined,
       })
       setSessionPlayers(session.id, selectedIds)
       navigate(`/sessions/${session.id}`)
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Failed to create session')
     }
   }
   ```

4. **Add Active Players section** (above existing label input)
   ```tsx
   <section className="space-y-3">
     <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
       <Users className="w-4 h-4" />
       Active Players
     </span>
     <ActivePlayersEditor
       players={allPlayers ?? []}
       selectedIds={selectedIds}
       onChange={setSelectedIds}
       isLoading={playersLoading || topLoading}
     />
   </section>
   ```

5. **Run typecheck**
   ```bash
   npm run build
   ```

## Todo List
- [ ] Import hook + component + store
- [ ] Add local `selectedIds` state with `defaultsAppliedRef` guard
- [ ] Default-seed effect from `useTopJoinedPlayers(5)`
- [ ] Render `ActivePlayersEditor` above label input
- [ ] Commit picks to store on Start success
- [ ] Verify build

## Success Criteria
- New page loads → top-5 chips appear after data resolves.
- Tapping a chip removes that player.
- Add button opens sheet, multi-pick + Add appends chips.
- Start Session navigates to detail page and the same chips appear there.
- Defaults only apply once — toggling chips before Start won't be overwritten by a late `topPlayers` update.

## Risk Assessment
- **Risk:** First-time user (zero matches) → `topPlayers` is `[]`. Page renders with no chips and Add button. → Acceptable.
- **Risk:** User manually clears all chips then re-renders ⇒ defaults wouldn't re-apply (correct — ref guards).
- **Risk:** Top-5 includes deleted/inactive players. → `useTopJoinedPlayers` maps via `usePlayers()` so any player gone from the roster is naturally filtered.

## Security Considerations
- No new DB writes here; session-store is local-only.

## Next Steps
- Phase 05 migrates SessionDetailPage to the same component.
