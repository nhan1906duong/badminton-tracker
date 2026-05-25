# Code Review: Firework Champion Effect

## Scope

- Files: `src/components/firework-effect.tsx`, `src/pages/SessionStatsPage.tsx`, `src/i18n.tsx`, `src/index.css`
- LOC changed: ~120 (new component) + ~70 (page modifications) + 2 (i18n) + 10 (CSS)
- Focus: Feature implementation review
- Build: PASS | Tests: 149/149 PASS | Lint: 11 pre-existing errors, 0 new

## Overall Assessment

Solid implementation. The firework effect is self-contained, correctly gated behind champion detection, and respects the "show once" constraint via localStorage. Canvas cleanup is proper. Minor issues: unused CSS keyframe, one edge case in localStorage initialization, and a missing `sessionId` dependency in `useMemo`.

**Score: 7.5/10**

---

## Critical Issues

None.

---

## High Priority

### 1. Unused CSS keyframe (`src/index.css`)

The `firework-fade-in` keyframe is defined but never referenced. Either apply it to the canvas or the champion banner, or remove it.

**Fix:** Add `animation: firework-fade-in 300ms ease-out` to the canvas style in `firework-effect.tsx`, or remove the keyframe.

### 2. Missing `sessionId` in `isChampion` useMemo dependency array (`src/pages/SessionStatsPage.tsx` line 191)

```tsx
const isChampion = useMemo(() => {
  if (!session?.ended_at || rankings.length === 0) return false
  if (!profile?.player_id) return false
  return rankings[0]?.playerId === profile.player_id
}, [session?.ended_at, rankings, profile?.player_id]) // <-- missing sessionId
```

If `sessionId` changes (rare in this app but possible with programmatic nav), the memo could return stale results. The ESLint `react-hooks/exhaustive-deps` rule would flag this if enabled.

**Fix:** Add `sessionId` to the dependency array, or if intentionally omitted, add an eslint-disable comment with explanation.

---

## Medium Priority

### 3. localStorage initializer returns `false` on error instead of `true` (`src/pages/SessionStatsPage.tsx` line 198-205)

```tsx
const [hasShownFirework, setHasShownFirework] = useState(() => {
  if (!storageKey) return true
  try {
    return localStorage.getItem(storageKey) === '1'
  } catch {
    return false  // <-- should be true to suppress firework when storage fails
  }
})
```

When `localStorage` is unavailable (private browsing, storage quota exceeded), returning `false` means `shouldShowFirework` stays `true` and the firework will show on every render. This creates an infinite re-show loop since the `useEffect` timer also catches and ignores the `localStorage.setItem` error.

**Fix:** Return `true` in the catch block so the firework is suppressed when persistence is unavailable.

### 4. Canvas resize not handled on window resize (`src/components/firework-effect.tsx`)

The component captures `width`/`height` once on mount. If the user rotates their phone or resizes the browser, the canvas stays at the old dimensions. The `resize()` function exists but is never attached to a `resize` event listener.

**Fix:** Add a `window.addEventListener('resize', resize)` in the effect and remove it in cleanup. Note: this requires re-scaling the DPR context, which may need `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` before each draw, or track the current scale factor.

### 5. `useAuth` import path mismatch with plan specification

Plan phase-02 specifies `import { useAuth } from '../contexts/AuthContext'` but the actual import is `import { useAuth } from '../hooks/useAuth'`. The latter is correct (the hook wrapper exists and is the project's established pattern), but the plan is out of sync.

**Note:** Not a code issue, but plan accuracy matters for future reference.

---

## Low Priority

### 6. `firework-effect.tsx` uses default export while project convention prefers named exports

The project CLAUDE.md states "One component per file" with the pattern `export function Component`. The firework component uses `export default`, which is inconsistent.

**Fix:** Change to `export function FireworkEffect()` and update the import in `SessionStatsPage.tsx`.

### 7. `Crown` icon fill/stroke uses raw CSS var without fallback

```tsx
<Crown size={14} fill="var(--accent)" stroke="var(--accent)" />
```

If `--accent` is undefined (e.g., design system not loaded), the icon becomes invisible. Low risk since the app controls the design system, but a fallback like `fill="var(--accent, #f97316)"` is safer.

### 8. Plan-specified `sessionStats.championBadge` translation key was not implemented

Phase 02 specifies both `sessionStats.champion` and `sessionStats.championBadge`, but only `sessionStats.champion` was added to i18n. The crown icon approach replaces the need for a text badge, so this is acceptable -- just a plan/implementation drift.

---

## Edge Cases Found by Scout

1. **Rapid navigation away and back**: If user leaves `SessionStatsPage` before the 4s timer fires, the `useEffect` cleanup clears the timer. On return, the firework shows again (localStorage not yet set). This is actually desirable -- they should see the full effect.

2. **Two users on same device**: localStorage key includes `player_id`, so different linked players get independent flags. Good.

3. **User unlinks player after seeing firework**: If they re-link the same player to the same session, the firework won't show again (flag persists). Acceptable.

4. **Rankings data changes while on page**: If `rankings[0]` changes (e.g., via background refetch), `isChampion` could flip from true to false mid-animation. The firework component is unmounted, which is fine since it cleans up its rAF.

5. **Canvas z-index 9999 may conflict with modals**: If any modal or bottom sheet uses z-index >= 9999, the firework renders underneath. The project's design system should document its z-index scale.

---

## Positive Observations

- **Proper cleanup**: `cancelAnimationFrame` + `running = false` on unmount prevents memory leaks and orphaned rAF loops.
- **DPR-aware canvas**: Uses `devicePixelRatio` for crisp rendering on Retina displays.
- **`pointer-events: none`**: Correctly allows interaction through the overlay.
- **`aria-hidden="true"`**: Good accessibility practice for decorative animation.
- **localStorage try/catch**: Defensive against private browsing mode.
- **Champion detection is precise**: Requires session ended + rankings loaded + linked player + rank #1 match. No false positives.
- **Tests pass**: All 149 existing tests pass; test mocks were updated for unrelated `useIsAdmin` hook.

---

## Recommended Actions

1. **Fix localStorage catch return value** (medium): Change `return false` to `return true` in the catch block.
2. **Add `sessionId` to `isChampion` dependencies** (high): Or document why it is intentionally omitted.
3. **Either use or remove `firework-fade-in` keyframe** (medium): Currently dead code.
4. **Add window resize handler for canvas** (medium): For mobile orientation changes.
5. **Consider named export for consistency** (low): Match project convention.

---

## Metrics

- Type Coverage: PASS (tsc -b clean)
- Test Coverage: 149/149 PASS
- Lint Issues: 11 pre-existing, 0 new
- Bundle impact: ~+2KB (canvas component, negligible)

---

## Unresolved Questions

1. Should the firework also trigger when a session is ended (from `SessionDetailPage`), or only when viewing stats?
2. Should there be a way for users to dismiss the firework early (tap to skip)?
3. The plan mentions `sessionStats.championBadge` but it was not implemented -- was this intentionally dropped in favor of the crown icon?
