# Phase 1: Foundations

## Priority
P0 — Everything else depends on this.

## Status
pending

## Description
Extract and codify all design tokens from the Japanese Sport / Vermilion spec into CSS custom properties and documentation.

## Key Insights
- oklch() color format ensures perceptually uniform lightness across hues
- Dark mode flips via `data-theme="dark"` on `<html>`
- Token values are identical across `match-card.html` and `session-card.html`

## Requirements

### Functional
- CSS custom properties for all tokens
- Light + dark theme definitions
- Documentation for each foundation category

### Non-functional
- Tokens must be overridable at runtime (CSS vars)
- Must work with Tailwind's arbitrary value syntax: `bg-[var(--accent)]`

## Architecture

```css
/* tokens.css */
:root {
  --bg: oklch(99% 0.003 50);
  --surface: oklch(100% 0 0);
  --fg: oklch(12% 0.02 50);
  --muted: oklch(50% 0.01 50);
  --border: oklch(88% 0.008 50);
  --accent: oklch(55% 0.20 30);
  --danger: oklch(55% 0.20 25);
  --success: oklch(50% 0.14 145);
  --warn: oklch(70% 0.14 85);
  --info: oklch(55% 0.12 250);

  --font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-mono: ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace;

  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
  --space-7: 48px; --space-8: 64px;

  --text-xs: 11px; --text-sm: 13px; --text-base: 15px;
  --text-lg: 18px; --text-xl: 24px; --text-2xl: 32px;
  --text-3xl: 48px;

  --radius-sm: 0px; --radius-md: 4px; --radius-lg: 8px;
  --border-width: 1px;
}

[data-theme="dark"] {
  --bg: oklch(12% 0.02 50);
  --surface: oklch(15% 0.018 50);
  --fg: oklch(95% 0.005 50);
  --muted: oklch(55% 0.01 50);
  --border: oklch(28% 0.015 50);
  --accent: oklch(60% 0.18 30);
  --danger: oklch(60% 0.18 25);
  --success: oklch(55% 0.12 145);
  --warn: oklch(70% 0.12 85);
  --info: oklch(55% 0.10 250);
}
```

## Files to Create
- `design-system/tokens/tokens.css`
- `design-system/foundations/colors.md`
- `design-system/foundations/typography.md`
- `design-system/foundations/spacing.md`
- `design-system/foundations/radius.md`
- `design-system/foundations/motion.md`

## Files to Modify
- `src/index.css` — import `design-system/tokens/tokens.css`

## Implementation Steps
1. Create `design-system/` directory structure
2. Write `tokens.css` with all tokens
3. Write foundation docs (concise, reference-style)
4. Import tokens.css in `src/index.css`
5. Verify tokens render on `/settings/design-system` page

## Success Criteria
- [ ] All 6 color tokens render correctly
- [ ] Dark mode toggles all tokens
- [ ] Tokens are consumable via `var(--token)` in any component

## Risk Assessment
- **Low risk** — CSS-only changes, no logic
- **Mitigation** — Test on `/settings/design-system` before proceeding

## Next Steps
Proceed to Phase 2 (Core Components) after tokens are verified.
