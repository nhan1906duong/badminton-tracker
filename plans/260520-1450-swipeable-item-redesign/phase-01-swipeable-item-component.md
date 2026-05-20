# Phase 1: SwipeableItem Component + Apply to All Lists

## Context

Current swipe-to-delete is duplicated inline in two places:
- `MatchCard.tsx` (lines 8-63): touch handlers + translateX state
- `PlayersPage.tsx` `SwipePlayerItem` (lines 13-59): identical logic

Both use `overflow-hidden rounded-2xl` container with a red `absolute inset-0` background layer. The foreground card has `active:scale-[0.98]` which shrinks the card on tap, exposing red at the rounded corners.

`SessionsListPage.tsx` has no swipe-to-delete at all.

## Architecture

```
SwipeableItem (generic wrapper)
├── Background layer: renderAction() → Delete button
└── Foreground layer: children → Any card/content
    └── translateX driven by touch events
```

## Implementation Steps

### Step 1: Create `src/components/SwipeableItem.tsx`

Extract the duplicated touch logic. Props:

```tsx
interface SwipeableItemProps {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onClick?: () => void        // tap to navigate (only if not swiped open)
  renderAction: () => React.ReactNode  // delete button bg
  children: React.ReactNode    // foreground content
  className?: string          // optional wrapper class
}
```

Keep constants `SWIPE_THRESHOLD = 60`, `DELETE_WIDTH = 80`.

Implementation:
- Same `useRef` + `useState` touch handling as current
- Container: `relative overflow-hidden rounded-2xl`
- Background: `absolute inset-0 flex items-center justify-end pr-5` (no bg color here — let `renderAction` provide it)
- Foreground: `relative w-full select-none` + translateX transform
- **NO `active:scale-[0.98]`** on foreground
- On click: if `isOpen`, close; else call `onClick`
- Touch handlers omitted when `readonly`-equivalent (not needed here, parent controls via not rendering)

### Step 2: Refactor `MatchCard.tsx`

Remove all swipe-related code (lines 8-9, 34-63, 90-114 touch parts).

New props:
```tsx
interface MatchCardProps {
  match: MatchWithDetails
  matchNumber: number
  onClick?: () => void        // navigation
  dateLabel?: string
  readonly?: boolean          // if true, no SwipeableItem wrapper
  hideAvatars?: boolean
}
```

If `readonly` is true, render plain card (no SwipeableItem wrapper).
If `readonly` is false, the **parent** wraps `MatchCard` in `SwipeableItem`.

Actually — better approach: keep MatchCard as the **content** only. The parent `SessionDetailPage` wraps it in `SwipeableItem`. This keeps MatchCard focused on display.

But MatchCard is also used elsewhere possibly... Let me check.

Actually looking at the code, `MatchCard` currently owns its own swipe. The cleanest refactor:
- **Option A**: MatchCard keeps swipe internally but delegates to a SwipeableItem internally. Still self-contained.
- **Option B**: MatchCard becomes pure content; parent wraps it.

Option A is simpler and less disruptive. MatchCard keeps `isSwiped/onSwipeOpen/onSwipeClose/onDelete` props and internally uses SwipeableItem. When `readonly`, skips SwipeableItem and renders plain card.

Go with **Option A** — less blast radius.

Changes to MatchCard:
- Remove `active:scale-[0.98] transition-transform` from foreground className
- Replace inline swipe markup with `<SwipeableItem>` usage
- Keep existing props interface (backward compatible)

### Step 3: Refactor `PlayersPage.tsx`

Remove `SwipePlayerItem` local component (lines 16-117). Replace with `SwipeableItem` wrapping the player card content inline in the map.

The player card content:
- Avatar button (with `stopPropagation` for edit)
- Name + stats text
- No `active:scale-[0.98]`

### Step 4: Add `useDeleteSession` to `useSessions.ts`

```tsx
export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
    },
  })
}
```

### Step 5: Add swipe-to-delete to `SessionsListPage.tsx`

- Import `SwipeableItem`, `useDeleteSession`, `Trash2`
- Track `swipedSessionId` and `confirmDeleteId` state (same pattern as other pages)
- Wrap each session button in `SwipeableItem`
- Add delete confirmation modal (same pattern as SessionDetailPage)
- **Remove `active:scale-[0.98] transition-transform`** from session card

### Step 6: Verify & Test

- `npm run lint` — no errors
- `npm run build` — compiles
- Visual check: tap item, no red leak at corners
- Swipe each item type, delete works

## Code Snippets

### SwipeableItem.tsx

```tsx
import { useState, useRef, useCallback } from 'react'

const SWIPE_THRESHOLD = 60
const DELETE_WIDTH = 80

interface SwipeableItemProps {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onClick?: () => void
  renderAction: () => React.ReactNode
  children: React.ReactNode
  className?: string
}

export function SwipeableItem({
  isOpen, onOpen, onClose, onClick,
  renderAction, children, className = ''
}: SwipeableItemProps) {
  const startX = useRef(0)
  const currentX = useRef(0)
  const [translateX, setTranslateX] = useState(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    currentX.current = isOpen ? -DELETE_WIDTH : 0
  }, [isOpen])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - startX.current
    let newX = currentX.current + delta
    if (newX > 0) newX = 0
    if (newX < -DELETE_WIDTH) newX = -DELETE_WIDTH
    setTranslateX(newX)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (translateX < -SWIPE_THRESHOLD) {
      setTranslateX(-DELETE_WIDTH)
      onOpen()
    } else {
      setTranslateX(0)
      onClose()
    }
  }, [translateX, onOpen, onClose])

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Background action layer */}
      <div className="absolute inset-0 flex items-center justify-end pr-5">
        {renderAction()}
      </div>

      {/* Foreground content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (isOpen) {
            setTranslateX(0)
            onClose()
          } else {
            onClick?.()
          }
        }}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: translateX === 0 || translateX === -DELETE_WIDTH
            ? 'transform 0.2s ease-out'
            : 'none',
        }}
        className="relative w-full select-none"
      >
        {children}
      </div>
    </div>
  )
}
```

### MatchCard usage of SwipeableItem

Inside MatchCard render, replace the outer `<div className="relative overflow-hidden rounded-2xl">` and its two children with:

```tsx
if (readonly) {
  return <div className="relative rounded-2xl">{cardContent}</div>
}

return (
  <SwipeableItem
    isOpen={isSwiped}
    onOpen={onSwipeOpen}
    onClose={onSwipeClose}
    onClick={handleClick}
    renderAction={() => (
      <button onClick={onDelete} className="flex flex-col items-center gap-0.5 text-white">
        <Trash2 className="w-5 h-5" />
        <span className="text-[10px] font-semibold">Delete</span>
      </button>
    )}
  >
    {cardContent}
  </SwipeableItem>
)
```

Where `cardContent` is the current foreground card markup minus the `active:scale-[0.98] transition-transform` classes.

## Todo

- [ ] Create `src/components/SwipeableItem.tsx`
- [ ] Refactor `MatchCard.tsx` to use SwipeableItem, remove `active:scale-[0.98]`
- [ ] Refactor `PlayersPage.tsx` to use SwipeableItem, remove SwipePlayerItem
- [ ] Add `useDeleteSession` to `useSessions.ts`
- [ ] Add swipe-to-delete to `SessionsListPage.tsx`
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Visual test: tap items, no red leak; swipe and delete all 3 types

## Success Criteria

- Red delete background never visible at corners during tap
- Single `SwipeableItem` component used by all 3 list types
- Match, Player, and Session items all support swipe-to-delete
- No `active:scale-[0.98]` on swipeable items
- All existing functionality preserved (navigation, edit, avatar picker)
- No TypeScript or lint errors
