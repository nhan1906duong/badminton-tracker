# Phase 6: Dark Mode + Testing

## Priority
P2 — Polish and quality.

## Status
pending

## Description
Implement dark mode toggle, run tests, verify visual parity with design spec.

## Blocked By
Phase 5 (Integration)

## Tasks

### 1. Dark Mode Toggle
- Add theme toggle to Settings page
- Persist preference to localStorage
- Apply `data-theme="dark"` to `<html>`
- Respect `prefers-color-scheme` on first visit

### 2. Testing
- Run `npm run test` — all existing tests must pass
- Run `npm run build` — no TypeScript errors
- Run `npm run lint` — no lint errors
- Manual testing on mobile viewport (390×844)

### 3. Design Verification
- Compare screenshots with design HTML at key viewports:
  - Mobile: 390×844
  - Tablet: 820×1180
  - Desktop: 1440×900

### 4. Documentation Update
- Update `docs/design-guidelines.md` with new tokens
- Update component inventory in `design-system/components/index.ts`

## Files to Modify
- `src/pages/SettingsPage.tsx` — add theme toggle
- `src/index.css` — add theme detection
- `docs/design-guidelines.md`

## Success Criteria
- [ ] Theme toggle works and persists
- [ ] All tests pass
- [ ] Build passes
- [ ] No visual regressions vs design spec

## Risk Assessment
- **Low risk** — Testing and polish phase
- **Mitigation** — Automated tests catch regressions
