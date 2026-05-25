# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Badminton Match Tracker — a PWA for tracking badminton matches, players, and rankings. Players who lose donate 5000 VND. Built with React 19 + TypeScript + Vite + Tailwind CSS v4 + Supabase.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run lint` | ESLint |
| `npm run test` | Run all tests (Vitest + jsdom) |
| `npx vitest run src/path/to/file.test.tsx` | Run a single test file |

## Architecture

### State Management (3 layers)

1. **TanStack Query** — server state (matches, players, sessions). Hooks in `src/hooks/use*.ts`. Each hook exports a `useQuery` hook + `useMutation` hooks. Mutations invalidate query keys on success.
2. **Zustand stores** — ephemeral cross-page state:
   - `src/stores/new-match-store.ts` — match creation flow (type, selected players, mode, scheduled time). Reset after save.
   - `src/stores/session-store.ts` — empty module (active player filter removed).
3. **React useState** — local UI state only.

### Auth

Email + password via `src/contexts/AuthContext.tsx` (`supabase.auth.signInWithPassword`). `RequireAuth` guard in `src/components/AnimatedRoutes.tsx` redirects unauthenticated users to `/login`. After login, user returns to original route via `location.state`.

Password changes use `supabase.auth.updateUser({ password })` after re-authenticating with the current password via `signInWithPassword` (`ChangePasswordPage` at `/settings/change-password`).

### Role-based Access Control

Users have a `role` column (`'admin' | 'user'`) on their `profiles` row. Admins are the only ones who can delete sessions, matches, or players — enforced at both the app layer and via Supabase RLS policies (see `supabase/migrations/008_role.sql`).

- `src/hooks/useIsAdmin.ts` — returns `true` if the current user's profile role is `'admin'`
- Admin-gated UI: "Delete session" (SessionDetailPage ⋮ menu), "Delete match" (MatchDetailPage ⋮ menu), "Add player" FAB (RankingPage)
- Authenticated-user UI: player avatar/name editing from PlayerDetailPage

### Navigation & Back Button

Routes in `src/components/AnimatedRoutes.tsx`. Page transitions are animated (forward/backward) except between tab routes.

**Tab routes** (no AppBar, bottom nav visible): `/sessions`, `/ranking`, `/settings`

**Back navigation**: All sub-page routes use `navigate(-1)` via the `AppBar` component. No custom back-routing logic in `App.tsx`.

### Match Creation Flow (single-page)

At `/sessions/:id/matches/new` (`CreateMatchPage`):
1. Pick match type (segmented chip selector)
2. Fill player slots (Team A / Team B) via bottom-sheet player picker
3. Choose **When**: Now (LIVE), Schedule (SCHEDULED + datetime), or Queue (SCHEDULED + queue_position)
4. Save → `navigate(-1)` back to session detail

After a match is created, tap it from session detail to open `MatchDetailPage`:
- Start (SCHEDULED → LIVE), Record Result (LIVE → COMPLETED with winner), End Match (LIVE → COMPLETED without winner), Reopen (COMPLETED → LIVE)
- Edit Players → `EditPlayersPage` (`/matches/:matchId/players/edit`)

### Data Model

Supabase PostgreSQL. Key tables: `players`, `sessions`, `matches`, `match_teams`, `match_participants`, `match_scores`, `profiles` (1:1 with auth.users, includes `role: 'admin' | 'user'` and `player_id` FK linking the auth user to a player row), `bwf_tournaments`.

A match has:
- 2 teams (`match_teams`: TEAM_A / TEAM_B, `is_winner` flag)
- N participants (`match_participants` linking players to teams)
- M scores (`match_scores` per set)

Only completed matches with a winning team count toward rankings, donations, player history, head-to-head stats, and best-partner stats. Completed no-winner matches keep their saved score but clear `player_match_results`.

A session has `label`, `started_at`, `ended_at`, and `bwf_tournament_id` (FK to `bwf_tournaments`). Multiple sessions with different tournaments (or no tournament) can be open simultaneously. Creating a session with a `bwf_tournament_id` that already has a session is blocked at both the app layer (`DuplicateTournamentError`) and the DB layer (partial unique index).

`bwf_tournaments` caches BWF calendar data (name, start_date, end_date, category_slug, category_name, venue). Populated manually via Supabase SQL Editor — never fetched at runtime because bwfbadminton.com is Cloudflare-protected.

Types in `src/types/database.ts`. Supabase client in `src/lib/supabase.ts`.

## Conventions

### File Naming
- Kebab-case: `player-selector.tsx`, `use-matches.ts`
- Descriptive names even if long
- Target <200 lines per file

### Component Structure
```tsx
// One component per file
interface Props { ... }
export function Component({ ... }: Props) {
  // hooks → state → handlers → render
}
```

### Styling
- Tailwind CSS utility classes only
- Mobile-first, max width `512px` (`max-w-lg`) centered
- Always include `active:` press states, 44px+ touch targets
- Refer to `docs/design-guidelines.md` for the full design system
- The dev-only `/settings/design-system` route renders all tokens for preview
- **Every new or restyled page must use `<AppBar>` from `design-system/components` for its top navigation — never build a custom nav bar.** Only tab routes (`/sessions`, `/ranking`, `/settings`) omit AppBar.

### Environment Variables
```env
VITE_SUPABASE_URL=<project-url>
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## Important Files

| File | Role |
|------|------|
| `src/lib/supabase.ts` | Supabase client |
| `src/contexts/AuthContext.tsx` | Auth state (email + password) |
| `src/components/AnimatedRoutes.tsx` | All routes + auth guard + page transitions |
| `src/App.tsx` | Bottom nav, app layout |
| `src/hooks/useMatches.ts` | Match CRUD + lifecycle mutations including no-winner completion |
| `src/hooks/usePlayers.ts` | Player CRUD |
| `src/components/PlayerForm.tsx` | Bottom-sheet modal for adding a player (design-system styled) |
| `src/components/FloatingActionButton.tsx` | Hanko-style square FAB (56×56px, accent color, fixed bottom-right) |
| `src/hooks/useSessions.ts` | Session CRUD + open session query |
| `src/hooks/useBwfTournaments.ts` | Read BWF tournament cache from Supabase; filter by date window |
| `src/hooks/useRankings.ts` | Elo-based player rankings + shared per-session leaderboard hooks |
| `src/hooks/useIsAdmin.ts` | Returns `true` if the current user's profile role is `'admin'` |
| `src/hooks/useProfile.ts` | Fetch user profile (`avatar_url`, `role`, `player_id`); `useUpdatePlayerLink` mutation to link/unlink a player |
| `src/lib/bwf-api.ts` | BWF category constants + priority order |
| `src/lib/rating.ts` | Elo rating algorithm + SCORING_CONFIG |
| `src/stores/new-match-store.ts` | Match creation flow state |
| `src/types/database.ts` | TypeScript types for all DB tables |
| `docs/design-guidelines.md` | Design system reference |
| `docs/navigation-flow.md` | Full navigation behavior spec |
