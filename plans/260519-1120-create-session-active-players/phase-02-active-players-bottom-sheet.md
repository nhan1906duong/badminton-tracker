# Phase 02 — Active Players Bottom Sheet

## Context Links
- [plan.md](./plan.md)
- Pattern reference: `src/components/AvatarPicker.tsx` (existing bottom-sheet pattern)
- Virtualization docs: <https://tanstack.com/virtual/latest>

## Overview
- **Priority:** P0
- **Status:** Pending
- Modal bottom sheet listing addable players. Virtualized list for huge rosters. Multi-select with circle indicator. Confirm via "Add" button in header.

## Key Insights
- Reuse existing modal-overlay pattern from `AvatarPicker.tsx` (`fixed inset-0 z-50 flex items-end` + `bg-black/40` backdrop).
- `@tanstack/react-virtual` needs a fixed-height scrollable container + per-item height. Use `estimateSize: () => 64` for `Avatar(40) + py-3 + name` row.
- "Disabled" Add button when nothing picked.
- Header: `X (close) | flex-1 | Add (outline button)` — Add is rounded with border per spec.
- iOS-style circle: empty `border-2 border-gray-300` → filled `bg-green-600` + `Check` icon (lucide).

## Requirements
- Props:
  ```ts
  interface ActivePlayersBottomSheetProps {
    players: Player[]            // already filtered (excludes those already active)
    onClose: () => void
    onConfirm: (selectedIds: string[]) => void
  }
  ```
- Internal state: `Set<string>` of locally-picked player IDs (reset every time sheet opens).
- Virtualized list, target ~64px row height.
- Tap row toggles selection.
- "Add" button shows count: e.g. `Add (3)` when 3 picked; disabled when 0.
- Backdrop click closes (without confirming).
- Keep sheet height capped at ~75svh so it doesn't push past the viewport on small phones.

## Architecture
```
ActivePlayersBottomSheet
├── Overlay backdrop (bg-black/40, click → onClose)
└── Sheet panel (bg-white, rounded-t-2xl, max-h-[75svh])
   ├── Drag handle
   ├── Header (X | spacer | Add button)
   └── Scroll container (flex-1, overflow-auto, virtualized)
      └── Virtual rows: Avatar + name + radio indicator
```

## Related Code Files
- **Create:** `src/components/ActivePlayersBottomSheet.tsx` (~150 lines)

## Implementation Steps

1. **Scaffold component** with overlay + sheet structure copied from `AvatarPicker`.

2. **Add header bar** — three slots:
   ```tsx
   <div className="flex items-center px-4 py-3 border-b border-gray-100">
     <button onClick={onClose} aria-label="Close" className="p-2 -ml-2 rounded-full active:bg-gray-100">
       <X className="w-5 h-5 text-gray-600" />
     </button>
     <div className="flex-1" />
     <button
       onClick={handleAdd}
       disabled={picked.size === 0}
       className="px-4 py-2 rounded-full border border-green-600 text-green-600 text-sm font-semibold active:bg-green-50 disabled:opacity-40 disabled:border-gray-300 disabled:text-gray-400"
     >
       Add{picked.size > 0 ? ` (${picked.size})` : ''}
     </button>
   </div>
   ```

3. **Virtualized list**
   ```tsx
   const parentRef = useRef<HTMLDivElement>(null)
   const rowVirtualizer = useVirtualizer({
     count: players.length,
     getScrollElement: () => parentRef.current,
     estimateSize: () => 64,
     overscan: 8,
   })
   ```

4. **Row render**
   ```tsx
   <button
     onClick={() => togglePick(player.id)}
     className="absolute top-0 left-0 w-full flex items-center gap-3 px-4 py-3 active:bg-gray-50"
     style={{ height: row.size, transform: `translateY(${row.start}px)` }}
   >
     <Avatar src={player.avatar_url} name={player.name} size={40} />
     <span className="flex-1 text-left text-[15px] font-medium text-gray-900 truncate">{player.name}</span>
     <CircleIndicator selected={picked.has(player.id)} />
   </button>
   ```

5. **CircleIndicator** (inline sub-component, ~10 lines)
   ```tsx
   function CircleIndicator({ selected }: { selected: boolean }) {
     return (
       <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
         selected ? 'bg-green-600' : 'border-2 border-gray-300 bg-white'
       }`}>
         {selected && <Check className="w-3.5 h-3.5 text-white" />}
       </div>
     )
   }
   ```

6. **Empty state** — if `players.length === 0`:
   ```tsx
   <div className="py-12 text-center text-sm text-gray-400">
     All players are already active.
   </div>
   ```

7. **Body scroll lock** — apply `overflow-hidden` to `document.body` on mount, clean up on unmount. (Pattern used app-wide for modals; check existing `AvatarPicker` — if not present, add via `useEffect`.)

8. **Click-outside** — overlay onClick → onClose; sheet panel `onClick={(e) => e.stopPropagation()}`.

9. **Run typecheck**
   ```bash
   npm run build
   ```

## Todo List
- [ ] Scaffold sheet + overlay
- [ ] Header row (X + Add button)
- [ ] Wire `useVirtualizer` for player list
- [ ] CircleIndicator + row JSX
- [ ] Empty state
- [ ] Body scroll lock on mount
- [ ] Verify build

## Success Criteria
- Sheet opens at bottom, dismisses on backdrop click.
- 1,000+ player list scrolls smoothly (only visible rows in DOM).
- Add button disabled until at least one pick; shows count.
- Confirm fires `onConfirm` with picked IDs and closes.

## Risk Assessment
- **Risk:** `useVirtualizer` height calc wrong → blank list. → Mitigation: log `rowVirtualizer.getTotalSize()` during dev; ensure parent has explicit height (`flex-1 min-h-0`).
- **Risk:** Sheet jumps when keyboard opens (none expected; no input here).

## Security Considerations
- N/A (read-only modal).

## Next Steps
- Phase 03 wraps this in `ActivePlayersEditor`.
