# Motion

Restrained, purposeful motion. No decorative animations.

## Durations

| Token             | Value    | Usage                  |
|-------------------|----------|------------------------|
| `--duration-fast`   | 0.12s  | Button press, opacity  |
| `--duration-normal` | 0.15s  | Border color, hover    |
| `--duration-slow`   | 0.3s   | Page transitions       |

## Easing

| Token            | Value       | Usage             |
|------------------|-------------|-------------------|
| `--easing-default` | ease-in-out | All transitions   |

## Keyframe Animations

### Pulse (Live Indicator)
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.85); }
}
```
Used for: live dot, serving indicator. Duration: 1.5s, infinite.

### Page Transitions (from existing app)
```css
@keyframes page-enter-from-right { /* 300ms cubic-bezier(0.32, 0.72, 0, 1) */ }
@keyframes page-enter-from-left  { /* 300ms cubic-bezier(0.32, 0.72, 0, 1) */ }
```

## Principles

- Press feedback: `active:opacity-70` or `active:bg-[var(--bg)]`
- No hover effects on mobile
- No long animations — instant feel preferred
- Animations respect `prefers-reduced-motion`
