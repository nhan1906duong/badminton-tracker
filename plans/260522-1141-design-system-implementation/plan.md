# Design System Implementation Plan

## Overview

Implement a production-ready design system for the Badminton Match Tracker app. Source of truth: `design/match-card.html` and `design/session-card.html` (Japanese Sport / Vermilion direction).

## Status

| Phase | Status |
|-------|--------|
| Phase 1: Foundations | pending |
| Phase 2: Core Components | pending |
| Phase 3: Domain Components | pending |
| Phase 4: Patterns | pending |
| Phase 5: Integration | pending |
| Phase 6: Dark Mode + Testing | pending |

## Key Decisions

| Decision | Choice |
|----------|--------|
| Visual direction | Japanese Sport / Vermilion (sans-serif, rounded, lighter borders) |
| Token system | CSS custom properties in `tokens.css` |
| Dark mode | `data-theme="dark"` attribute toggle |
| Integration | `bg-[var(--accent)]`, `text-[var(--fg)]` in Tailwind |
| Fonts | `-apple-system, 'SF Pro Display', Inter, system-ui` |

## Structure

```
design-system/
├── foundations/      # Docs: colors, typography, spacing, radius, motion
├── tokens/
│   └── tokens.css    # CSS custom properties :root + [data-theme="dark"]
├── components/       # Reusable React components
│   ├── button.tsx
│   ├── input.tsx
│   ├── badge.tsx
│   ├── card.tsx
│   ├── tabs.tsx
│   ├── match-card.tsx
│   ├── session-card.tsx
│   └── index.ts
└── patterns/         # Composite patterns
    ├── empty-state.tsx
    ├── loading-state.tsx
    ├── error-state.tsx
    └── score-block.tsx
```

## Dependencies

- No new dependencies. Uses existing React 19 + Tailwind CSS v4.

## Success Criteria

- [ ] All tokens render correctly in light and dark mode
- [ ] Components match design spec pixel-for-pixel
- [ ] Existing pages continue to work during migration
- [ ] No visual regressions after full integration
