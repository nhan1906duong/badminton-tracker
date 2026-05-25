# QA Tester Memory

## Project Context
- Badminton Match Tracker PWA
- Stack: React 19 + TypeScript + Vite + Tailwind CSS v4 + Supabase
- Test suite: Vitest + jsdom
- Key pages: Sessions, Ranking, Settings tabs + sub-pages (CreateMatch, MatchDetail, SessionDetail, SessionStats)

## Key Patterns Learned

### useIsAdmin requires mock in all page tests
Pages using `useIsAdmin()` (internally calls `useAuth()`) need explicit mock:
```typescript
vi.mock('../../hooks/useIsAdmin', () => ({
  useIsAdmin: () => true, // or false
}))
```

### SegmentedControl uses `tabs` prop (not `options`)
```typescript
// Correct mock:
SegmentedControl: ({ value, tabs, onChange }) => (...)
```

### AppBar leftAction uses `icon` JSX, not `label` string
```typescript
// Real component:
<AppBar leftAction={{ icon: <ChevronLeft />, onClick: fn }} />

// Mock must render button with accessible name:
{leftAction && <button onClick={leftAction.onClick}>Session</button>}
```

### Design-system paths in page tests
Tests in `src/pages/__tests__/` mock design-system at `../../../design-system/`

## Test Files Location
- `src/pages/__tests__/` — page component tests
- `src/components/__tests__/` — component tests
- `src/hooks/__tests__/` — hook tests

## Missing Test Coverage
- SessionStatsPage (no test file)
- useRankings hook (no test file)
- usePlayerStats hook (indirectly tested via SessionDetailPage)

## Commands
- `npm run test -- --run` — run all tests
- `npm run test -- --run src/path/file.test.tsx` — run single file
- `npm run build` — typecheck + production build