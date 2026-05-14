# Code Review Report — Phases 2-4 Implementation

## Scope
18 source files, ~1,250 lines. Phases 2-4 (schema, auth, players, match recording).

## Critical Issues (Fixed)

| # | Issue | Fix |
|---|-------|-----|
| 1 | LoginPage "Back" button no-op | Added `resetOtp()` to AuthContext, wired to back button |
| 2 | `useMatches` N+1 query (3 queries per match) | Replaced with single nested Supabase select |
| 3 | `ScoreEntry` useEffect potential infinite loop | Removed useEffect; winner calculated in action callbacks only |
| 4 | `parseInt` silent NaN coercion | Added `isNaN` guard with early return |
| 5 | `teamMap.get()` non-null assertion | Added safety check; throws if teams not created |
| 6 | `NewMatchPage` no loading state for players | Added `playersLoading` conditional UI |
| 7 | `PlayerForm` no name length validation | Added max 100 char check |
| 8 | `handleTogglePlayer` nested setState | Restructured to call setters at top level |

## Remaining (Non-Critical)

- RLS: Players table allows any auth user to modify/delete any player (by design — open sharing model)
- No transaction wrapper for match creation (4 sequential inserts)
- No Error Boundary around routes
- `Player` type `created_by` is non-optional vs DB allows null
- `useCreatePlayer` does not set `created_by`
- `HomePage` computes teamA/teamB with `.find()` inside `.filter()` on every render
- Score validation helper exists but not enforced in UI

## Build Status
TypeScript compiles clean. Vite build produces 499KB JS (142KB gzipped) + PWA service worker.
