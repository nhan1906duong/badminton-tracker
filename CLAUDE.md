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
   - `src/stores/new-match-store.ts` — match creation flow (type, selected players, scores, winner). Reset after save.
   - `src/stores/session-store.ts` — per-session active player filter, persisted to localStorage.
3. **React useState** — local UI state only.

### Auth

Supabase OTP (magic link) via `src/contexts/AuthContext.tsx`. `RequireAuth` guard in `src/components/AnimatedRoutes.tsx` redirects unauthenticated users to `/login`. After login, user returns to original route via `location.state`.

### Navigation & Back Button

Routes in `src/components/AnimatedRoutes.tsx`. Page transitions are animated (forward/backward) except between tab routes.

**Tab routes** (no AppBar, bottom nav visible): `/`, `/sessions`, `/players`, `/settings`

**Full-screen routes** (no AppBar, no bottom nav — page owns its own nav bar and bottom CTA): `/sessions/new`. Defined in `FULL_SCREEN_ROUTES` in `src/App.tsx`.

**Back navigation** is custom in `src/App.tsx` `handleBack()`:
- Result page → Select Players page (replace)
- Select Players → Session Detail (replace)
- Session Detail → `location.state.from` (set by caller) or falls back to `/`
- Other pages → browser back (`navigate(-1)`)

Pages navigating **to** Session Detail must pass `state: { from: '<route>' }` so back works correctly.

### Match Creation Flow (2-step)

1. **Select Players** (`/sessions/:id/matches/new`)
   - Pick match type → unified 2-column player grid
   - Auto-advances to step 2 when enough players selected
   - Players auto-assign: first N to Team A (blue), rest to Team B (red)
2. **Final Result** (`/sessions/:id/matches/new/result`)
   - Enter per-set scores (tap "+ Add Set")
   - Select winner → Save
   - After save: `navigate(-2)` to return to session detail

### Data Model

Supabase PostgreSQL. Key tables: `players`, `sessions`, `matches`, `match_teams`, `match_participants`, `match_scores`, `profiles` (1:1 with auth.users), `bwf_tournaments`.

A match has:
- 2 teams (`match_teams`: TEAM_A / TEAM_B, `is_winner` flag)
- N participants (`match_participants` linking players to teams)
- M scores (`match_scores` per set)

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
- **Every new or restyled page must use `<AppBar>` from `design-system/components` for its top navigation — never build a custom nav bar.** Only tab routes (`/`, `/sessions`, `/players`, `/settings`) omit AppBar.

### Environment Variables
```env
VITE_SUPABASE_URL=<project-url>
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## Important Files

| File | Role |
|------|------|
| `src/lib/supabase.ts` | Supabase client |
| `src/contexts/AuthContext.tsx` | Auth state (OTP) |
| `src/components/AnimatedRoutes.tsx` | All routes + auth guard + page transitions |
| `src/App.tsx` | AppBar, bottom nav, back button logic |
| `src/hooks/useMatches.ts` | Match CRUD + optimistic updates |
| `src/hooks/usePlayers.ts` | Player CRUD |
| `src/hooks/useSessions.ts` | Session CRUD + open session query |
| `src/hooks/useBwfTournaments.ts` | Read BWF tournament cache from Supabase; filter by date window |
| `src/lib/bwf-api.ts` | BWF category constants + priority order |
| `src/stores/new-match-store.ts` | Match creation flow state |
| `src/types/database.ts` | TypeScript types for all DB tables |
| `docs/design-guidelines.md` | Design system reference |
| `docs/navigation-flow.md` | Full navigation behavior spec |
