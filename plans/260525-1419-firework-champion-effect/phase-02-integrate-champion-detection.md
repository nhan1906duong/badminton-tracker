# Phase 2: Integrate Champion Detection

## Overview

Wire `FireworkEffect` into `SessionStatsPage`. Detect if the current logged-in user is the session champion (rank #1) when viewing an ended session. Show the effect once per session per user.

## Key Insights

- Champion = `rankings[0]?.playerId` from `useSessionWeeklyRankings()`
- Current user's linked player = `profile?.player_id` from `useProfile(user?.id)`
- Session ended = `session?.ended_at` is not null
- Auth user = `user` from `AuthContext` via `useAuth()`
- Show only once: use `localStorage` key = `champion-firework:{sessionId}:{playerId}`

## Requirements

- Show firework effect when ALL conditions met:
  1. Session has ended (`session.ended_at` exists)
  2. Rankings loaded and length > 0
  3. Current user is logged in
  4. Current user has a linked player (`profile.player_id`)
  5. Linked player's ID matches rank #1 player's ID
  6. Firework has not been shown for this session+player before (localStorage check)
- After showing, set localStorage flag so it does not repeat on revisit
- Also show a "Champion!" badge/text on the current user's row in the rankings list

## Related Code Files

### Modify
- `src/pages/SessionStatsPage.tsx` — Add firework + champion detection logic
- `src/i18n.tsx` — Add translation keys: `sessionStats.champion`, `sessionStats.championBadge`

## Implementation Steps

1. **Import dependencies in `SessionStatsPage.tsx`**:
   - `import { useAuth } from '../contexts/AuthContext'`
   - `import { useProfile } from '../hooks/useProfile'`
   - `import FireworkEffect from '../components/firework-effect'`

2. **Add hooks and champion detection**:
   ```tsx
   const { user } = useAuth()
   const { data: profile } = useProfile(user?.id)

   const isChampion = useMemo(() => {
     if (!session?.ended_at || rankings.length === 0) return false
     if (!profile?.player_id) return false
     return rankings[0]?.playerId === profile.player_id
   }, [session?.ended_at, rankings, profile?.player_id])
   ```

3. **Add localStorage-based "shown" state**:
   ```tsx
   const storageKey = `champion-firework:${sessionId}:${profile?.player_id}`
   const [hasShown, setHasShown] = useState(() => {
     try { return localStorage.getItem(storageKey) === '1' }
     catch { return false }
   })
   const shouldShowFirework = isChampion && !hasShown
   ```

4. **Mark as shown after animation completes**:
   ```tsx
   useEffect(() => {
     if (!shouldShowFirework) return
     const timer = setTimeout(() => {
       try { localStorage.setItem(storageKey, '1') }
       catch { /* ignore */ }
       setHasShown(true)
     }, 4000)
     return () => clearTimeout(timer)
   }, [shouldShowFirework, storageKey])
   ```

5. **Render firework component conditionally**:
   ```tsx
   {shouldShowFirework && <FireworkEffect />}
   ```

6. **Add champion badge on the user's ranking row**:
   - In `PlayerStatsRow`, add a "Champion" badge when `rank === 1`:
   ```tsx
   {rank === 1 && (
     <span className="...">{t('sessionStats.championBadge')}</span>
   )}
   ```
   - Or add a crown icon next to the rank number for rank 1.

7. **Add i18n keys** in `src/i18n.tsx`:
   - `en`: `'sessionStats.championBadge': 'Champion'`, `'sessionStats.champion': 'You are the champion!'`
   - `vi`: `'sessionStats.championBadge': 'Quán quân'`, `'sessionStats.champion': 'Bạn là quán quân!'`

## Todo

- [x] Import `useAuth`, `useProfile`, `FireworkEffect` into `SessionStatsPage.tsx`
- [x] Add `isChampion` memo + `shouldShowFirework` state
- [x] Render `<FireworkEffect />` conditionally
- [x] Add champion badge/icon for rank 1 row
- [x] Add i18n keys for champion text
- [x] Run `npm run lint` and `npm run build` to verify

## Success Criteria

- Firework shows ONLY when viewing an ended session where the current user is rank #1
- Firework does NOT show on revisit (localStorage persists)
- Firework does NOT show for non-champions
- Firework does NOT show for live/scheduled sessions
- Champion badge visible on rank 1 row
- No console errors

## Verification

- `npm run build` passes.
- `npm test -- --run` passes: 149 tests.
- `npm run lint` was run and still reports 11 pre-existing errors outside this feature.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Firework shows for every page refresh | localStorage flag per session+player |
| Unauthenticated user sees nothing | `profile?.player_id` check gates it |
| SSR/hydration mismatch | localStorage read inside `useState` initializer is safe |

## Unresolved Questions

1. Should the firework also show on `SessionDetailPage` when the session ends (not just on Stats page)?
2. Should there be a dismiss button to stop the firework early?
