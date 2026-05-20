# Plan: Swipeable Item Redesign

Redesign swipe-left-to-delete into a reusable component and apply it to Match, Player, and Session items.

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| [Phase 1](phase-01-swipeable-item-component.md) | Build reusable SwipeableItem + apply to Match, Player, Session | Pending |

## Requirements

1. **Fix red delete bg leak**: Remove `active:scale-[0.98]` that causes red background to show at corners when tapped
2. **Reusable swipe component**: Extract duplicated touch logic from MatchCard and PlayersPage into a single `SwipeableItem` component
3. **Apply to all 3 item types**: Match (SessionDetailPage), Player (PlayersPage), Session (SessionsListPage)
4. **Remove zoom-in on tap**: MatchCard currently has `active:scale-[0.98]` on the foreground card — remove it

## Key Decisions

- **No `active:scale-[0.98]` on swipeable items**: The scale transform shrinks the card inward, exposing the red delete background at the rounded corners. Remove entirely for swipeable items.
- **Render prop pattern for SwipeableItem**: `children` for foreground content, `renderAction` for the background delete button. Keeps the component generic.
- **Session delete**: Need to add `useDeleteSession` hook (does not exist yet).
- **SessionDetailPage already has delete confirmation modal**: Reuse same pattern.

## Files to Create

- `src/components/SwipeableItem.tsx` — reusable swipe container

## Files to Modify

- `src/components/MatchCard.tsx` — remove inline swipe logic, use SwipeableItem
- `src/pages/PlayersPage.tsx` — remove inline SwipePlayerItem, use SwipeableItem
- `src/pages/SessionsListPage.tsx` — add swipe-to-delete
- `src/hooks/useSessions.ts` — add `useDeleteSession` mutation

## Risks

- Touch event handling on nested interactive elements (e.g., avatar picker in PlayersPage) — `stopPropagation` already used, should work.
- Only-one-item-open behavior: managed by parent via `isOpen/onOpen/onClose` props, same as current.
