# Phase 5: Integration

## Priority
P1 — Replace existing components.

## Status
pending

## Description
Replace existing `src/components/` with design-system equivalents, page by page.

## Blocked By
Phase 3 (Domain Components) + Phase 4 (Patterns)

## Migration Strategy

Replace components incrementally, one page at a time:

| Page | Components to Replace |
|------|----------------------|
| HomePage | MatchCard, EmptyState |
| SessionsListPage | SessionCard, EmptyState |
| SessionDetailPage | MatchCard, EmptyState |
| PlayersPage | ListItem, RankItem, EmptyState |
| PlayerDetailPage | StatRow, MatchCard |
| SettingsPage | Tabs, Input, Toggle |
| LoginPage | Input, Button |
| CreateSessionPage | Input, Button |
| SessionMatchPlayersPage | ListItem, Button |
| SessionMatchResultPage | ScoreBlock, Input, Button |

## Files to Modify
- `src/pages/*.tsx` — update imports and component usage
- `src/components/*.tsx` — replace or delete

## Implementation Steps
1. Update `src/index.css` to import tokens
2. Replace components on HomePage
3. Replace components on SessionsListPage
4. Replace components on SessionDetailPage
5. Replace components on PlayersPage
6. Replace components on remaining pages
7. Remove old component files no longer used
8. Update `docs/design-guidelines.md`

## Rollback Strategy
- Keep old components until new ones are verified
- Use feature branch: `feature/design-ui-ux`
- Test each page before moving to next

## Success Criteria
- [ ] All pages render with new design system components
- [ ] No console errors
- [ ] Mobile interactions work (swipe, tap)
- [ ] App still builds (`npm run build` passes)

## Risk Assessment
- **High risk** — Touches many files, potential regressions
- **Mitigation** — Page-by-page migration, test after each page
