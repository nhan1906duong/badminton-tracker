# Phase 1: Create Firework Component

## Overview

Build a self-contained Canvas 2D firework particle effect component. No external libraries. Fullscreen overlay, auto-plays on mount, stops after ~3.5s.

## Key Insights

- Project has no animation libraries — pure CSS + Canvas 2D is the established pattern
- Canvas overlay must use `pointer-events: none` so it does not block interactions
- Mobile-optimized: limit particle count to avoid jank on low-end devices

## Architecture

```
FireworkEffect
├── Canvas (fullscreen overlay, pointer-events: none)
│   ├── Rocket particles (shoot upward)
│   └── Burst particles (explode + gravity + fade)
└── requestAnimationFrame loop
    ├── Spawn rockets at intervals
    ├── Update particle positions
    └── Auto-stop when duration exceeded
```

## Related Code Files

### Create
- `src/components/firework-effect.tsx` — Canvas firework component (~120 lines)

## Implementation Steps

1. **Create `src/components/firework-effect.tsx`**
   - Use `useRef` for canvas + animation frame id
   - Use `useEffect` to start animation on mount, cleanup on unmount
   - Particle system:
     - `Rocket`: x, y, vx, vy, color, dead flag. Shoots from bottom to a target height.
     - `Particle`: x, y, vx, vy, alpha, decay, color, gravity. Burst from rocket death.
   - Colors: warm palette (gold, orange, red, pink, lime) — aligns with accent color theme
   - Parameters: `durationMs = 3500`, `rocketInterval = 300ms`, max ~60 particles on screen
   - Gravity pulls particles down. Alpha fades over time. Remove dead particles.
   - Stop spawning rockets after `durationMs`. Clear canvas + cancel rAF when all particles dead.

2. **Add CSS keyframes for fade-in** in `src/index.css`:
   ```css
   @keyframes firework-fade-in {
     from { opacity: 0; }
     to { opacity: 1; }
   }
   ```

## Todo

- [x] Create `src/components/firework-effect.tsx`
- [x] Add `firework-fade-in` keyframe to `src/index.css`
- [x] Verify no TypeScript errors (`npm run build` or `npx tsc -b`)

## Success Criteria

- Component renders without errors
- Canvas shows colorful firework bursts
- Animation auto-stops and cleans up
- No layout shift or interaction blocking

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Performance on low-end devices | Limit particle count, use simple math, clear dead particles aggressively |
| Canvas sizing on mobile | Read `canvas.clientWidth/Height` each frame, handle DPR |

## Next Steps

- Phase 2: Wire component into `SessionStatsPage` with champion detection
