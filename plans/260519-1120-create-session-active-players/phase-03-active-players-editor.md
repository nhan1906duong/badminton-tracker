# Phase 03 — Active Players Editor (Shared Component)

## Context Links
- [plan.md](./plan.md)
- [Phase 02 — Bottom Sheet](./phase-02-active-players-bottom-sheet.md)

## Overview
- **Priority:** P0
- **Status:** Pending
- Controlled component: renders selected players as removable chips and an "Add active player" trigger that opens the bottom sheet. Pure controlled — parent owns `selectedIds`.

## Key Insights
- Controlled API keeps both consumers simple: CreateSessionPage uses local React state; SessionDetailPage binds to Zustand store.
- Chip behavior per spec: tap = remove. No "X" affordance needed (whole chip is the toggle target).
- Bottom sheet receives **filtered** players (already-selected excluded) — Editor handles the filter so sheet stays dumb.

## Requirements
- Props:
  ```ts
  interface ActivePlayersEditorProps {
    players: Player[]            // full roster (loading handled upstream OK)
    selectedIds: string[]
    onChange: (ids: string[]) => void
    isLoading?: boolean
  }
  ```
- Layout:
  - Chips wrap in `flex flex-wrap gap-2`.
  - "Add active player" button rendered inline at the end of the chips (also acts as empty-state CTA when no selection).
- Open bottom sheet on Add click; on confirm, merge new IDs into `selectedIds`.
- No internal selectedIds state — fully controlled.

## Architecture
```
ActivePlayersEditor (controlled)
├── Chip list (selectedIds.map → PlayerChip)
├── "Add active player" button → opens sheet
└── ActivePlayersBottomSheet (mounted when open)
    └── players = roster.filter(p => !selectedIds.includes(p.id))
```

## Related Code Files
- **Create:** `src/components/ActivePlayersEditor.tsx` (~100 lines)

## Implementation Steps

1. **Component skeleton**
   ```tsx
   import { useState, useMemo } from 'react'
   import { Plus } from 'lucide-react'
   import type { Player } from '../types/database'
   import Avatar from './Avatar'
   import ActivePlayersBottomSheet from './ActivePlayersBottomSheet'

   export default function ActivePlayersEditor({ players, selectedIds, onChange, isLoading }: Props) {
     const [sheetOpen, setSheetOpen] = useState(false)

     const selectedPlayers = useMemo(
       () => selectedIds
         .map(id => players.find(p => p.id === id))
         .filter((p): p is Player => !!p),
       [players, selectedIds],
     )

     const addablePlayers = useMemo(
       () => players.filter(p => !selectedIds.includes(p.id)),
       [players, selectedIds],
     )

     // handlers + render
   }
   ```

2. **Render chips**
   ```tsx
   <div className="flex flex-wrap gap-2">
     {selectedPlayers.map(player => (
       <button
         key={player.id}
         onClick={() => onChange(selectedIds.filter(id => id !== player.id))}
         className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-green-600 text-white text-sm font-medium shadow-sm active:scale-95 transition-transform"
       >
         <Avatar src={player.avatar_url} name={player.name} size={24} bgColor="rgba(255,255,255,0.2)" textColor="#ffffff" />
         <span className="truncate max-w-[160px]">{player.name}</span>
       </button>
     ))}

     <button
       onClick={() => setSheetOpen(true)}
       disabled={isLoading || addablePlayers.length === 0}
       className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-600 text-sm font-medium active:bg-gray-50 disabled:opacity-40"
     >
       <Plus className="w-4 h-4" />
       Add active player
     </button>
   </div>
   ```

3. **Loading state** — render skeleton chips when `isLoading && selectedPlayers.length === 0`:
   ```tsx
   {isLoading && selectedPlayers.length === 0 ? (
     <div className="flex gap-2">
       {[1,2,3].map(i => <div key={i} className="w-24 h-8 rounded-full bg-gray-100 animate-pulse" />)}
     </div>
   ) : ( … chips JSX … )}
   ```

4. **Mount bottom sheet**
   ```tsx
   {sheetOpen && (
     <ActivePlayersBottomSheet
       players={addablePlayers}
       onClose={() => setSheetOpen(false)}
       onConfirm={(ids) => {
         onChange([...selectedIds, ...ids])
         setSheetOpen(false)
       }}
     />
   )}
   ```

5. **Run typecheck**
   ```bash
   npm run build
   ```

## Todo List
- [ ] Create `ActivePlayersEditor.tsx`
- [ ] Chip rendering (tap-to-remove)
- [ ] Add button with disabled state when no addable players
- [ ] Loading skeleton
- [ ] Sheet mount + confirm wiring
- [ ] Verify build

## Success Criteria
- Tapping a chip removes that player via `onChange`.
- Add button opens sheet, confirming appends to selection.
- Empty selection still shows Add button.
- Total file ≤ 200 LOC.

## Risk Assessment
- **Risk:** Chip whitespace collapse with long names. → `truncate max-w-[160px]` already caps.
- **Risk:** Avatar bgColor on green chip looks off. → Use 20% white overlay (`rgba(255,255,255,0.2)`).

## Next Steps
- Phase 04 wires this into CreateSessionPage.
- Phase 05 wires this into SessionDetailPage.
