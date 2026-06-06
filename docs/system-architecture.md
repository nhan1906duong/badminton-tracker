# System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (PWA)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  React 19   │  │ TanStack    │  │   Tailwind  │     │
│  │  Components │  │   Query     │  │   CSS v4    │     │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘     │
│         │                │                              │
│  ┌──────┴────────────────┴──────────────────────┐     │
│  │              Supabase Client                  │     │
│  │         (Auth + Database + Realtime)          │     │
│  └──────────────────────┬───────────────────────┘     │
└─────────────────────────┼─────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼────┐    ┌──────▼──────┐   ┌─────▼─────┐
    │  Auth   │    │  Database   │   │  Realtime  │
    │Password │    │ PostgreSQL  │   │  (Future) │
    └─────────┘    └─────────────┘   └───────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI | React 19 + TypeScript | Component framework |
| Routing | React Router v7 | Page navigation |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| State | TanStack Query v5 | Server state caching |
| Backend | Supabase | Auth + Database + API |
| Build | Vite | Dev server + bundler |
| PWA | vite-plugin-pwa | Installable app |

## Routes

| Path | Component | Auth Required |
|------|-----------|---------------|
| /login | LoginPage | No |
| / | → /sessions (redirect) | Yes |
| /sessions | SessionsListPage | Yes |
| /sessions/active | ActiveSessionRedirect | Yes |
| /sessions/new | CreateSessionPage | Yes |
| /sessions/:id | SessionDetailPage | Yes |
| /sessions/:id/stats | SessionStatsPage | Yes |
| /sessions/:id/donated | SessionDonatedListPage | Yes |
| /sessions/:id/matches/new | CreateMatchPage | Yes |
| /sessions/:id/matches/:matchId | MatchDetailPage | Yes |
| /sessions/:id/matches/:matchId/points | MatchPointsPage | Yes |
| /sessions/:id/matches/:matchId/players/edit | EditPlayersPage | Yes |
| /sessions/:id/matches/:matchId/edit | LegacyEditMatchRedirect | Yes |
| /players/:playerId | PlayerDetailPage | Yes |
| /ranking | RankingPage | Yes |
| /settings | SettingsPage | Yes |
| /settings/points | PointSystemPage | Yes |
| /settings/change-password | ChangePasswordPage | Yes |
| /settings/design-system | DesignSystemPage | Yes (dev) |
| * | → / | Redirect |

## Data Flow

```
1. User logs in → Supabase Auth → JWT stored in localStorage
2. API calls include JWT automatically via Supabase client
3. TanStack Query caches responses, invalidates on mutations
4. React components re-render on query changes
```

## Session-Based Match Flow

```
1. Create Session (regular, tournament, or league)
         ↓
2. For scheduled regular/tournament sessions, linked players/admins RSVP in `session_attendances`
         ↓
3. Add Match → Select Type + Players (declined RSVP players are filtered out for regular/tournament sessions)
         ↓
4. Live scoring happens in page state until finalization
         ↓
5. Select Winner → save scores + `player_match_results`
   OR End Match → save score with no winner and no ranking rows
         ↓
6. Edit Match later (players, scores, winner, match type)
         ↓
7. End Session when done
```

League sessions skip RSVP and use fixed `league_teams` rosters plus generated round-robin schedule rows on `matches.league_round`.

Match list display order (client-side, via `sortMatches` in `MatchesContent.tsx`):
1. **LIVE** — top, oldest first (created_at asc)
2. **SCHEDULED / queue** — middle, by queue_position asc (nulls last)
3. **COMPLETED** — bottom, most recently ended first (ended_at desc, falls back to created_at)

## Ranking & Session Leaderboards

`player_match_results` is the canonical source for weekly/session rankings. `useRecordResult()` creates or updates those rows when a winner is recorded. `useEndMatchNoWinner()` completes a match, clears team winners, deletes any result rows for that match, and saves non-empty score rows so invalid/stopped matches do not affect standings.

`useRankings.ts` exposes shared session leaderboard hooks:

| Hook | Purpose |
|------|---------|
| `useSessionWeeklyRankings(sessionId)` | Rankings array for a single session |
| `useSessionLeaderboard(sessionId)` | Rankings plus `leader` for session detail/stats pages |
| `useSessionLeaderboards()` | Map of session id → leaderboard for session cards |

Only `COMPLETED` matches with a winning team count toward session stat panels, player history, head-to-head stats, partner stats, donations, and Elo recalculation.

Only **ended sessions** (`ended_at IS NOT NULL`) count toward player achievements (champion/runner-up), milestone badges (dynasty, titles, most-played, streak, most-donated), and all-time ranking stats (matchesPlayed, wins, losses, weeklyPoints). Results from matches inside a live session are written to `player_match_results` immediately but are excluded from these aggregations until the session is closed.

The all-time ranking rows (Player tab) also show a current weekly Top 1 streak when a player has led more than one consecutive active calendar week. This is derived client-side from ended sessions and `player_match_results`: sessions are grouped by local calendar week from `started_at`, player `total_weekly_points` are summed across all sessions in that week, and the weekly leader is chosen by points, wins, point difference, then name. Empty calendar weeks are ignored, and duplicate result rows are de-duplicated by `player_id + match_id`.

`RankingPage` has four tabs: **Singles** (all-time Elo), **Doubles** (MD doubles pair rankings sorted by win rate → wins → matches played, using `useMenDoublesRankings`), **Current session** (latest ended session leaderboard), and **Head to Head** (interactive 2v2 comparison: select up to 2 players per side, shows win counts, a win-% gauge, and match history). The Doubles tab only counts MEN_DOUBLES matches from ended sessions. The Head to Head tab uses `computeH2HPairs` (exported pure function from `useH2HPairs.ts`) which matches on exact team composition and handles both normal and reversed orientations.

## Authentication Flow

```
1. User enters email + password → supabase.auth.signInWithPassword
2. On success: session stored, user redirected to original route
3. RequireAuth guard in AnimatedRoutes.tsx redirects unauthenticated users to /login
4. Password change: re-authenticate with current password → supabase.auth.updateUser({ password })
```

## Navigation & Back Button Behavior

### Tab Routes (no back button)

The back button is hidden on the 3 bottom-tab root pages:

| Route | Tab |
|-------|-----|
| `/sessions` | Sessions |
| `/ranking` | Ranking |
| `/settings` | Settings |

### Back Routing Rules

All sub-page routes use `navigate(-1)` (browser back) via the `AppBar` component. No custom routing logic in `App.tsx`.

## PWA Configuration

- Service worker for offline caching
- Web app manifest for install prompt
- App icon placeholders in `/public`

## Locale & Settings

`LocaleProvider` in `src/i18n.tsx` supplies English/Vietnamese copy through `useI18n()`. The Settings page lets users switch locale, link/unlink their auth profile to one player row, view point-system rules, change password, and run rating recalculation. Admin users also see a JSON backup action powered by `useBackupData()`.

## Role-based Access Control

Users have a `role` column (`'admin' | 'user'`) on their `profiles` row. RLS policies restrict destructive deletes to admins (`is_admin()` SQL function defined in `supabase/migrations/008_role.sql`). Authenticated users can start/end sessions and edit match lifecycle/details through `011_authenticated_update_sessions.sql` and `012_authenticated_match_edits.sql`. Player avatar/name editing is available from `PlayerDetailPage`; delete UI remains admin-gated through `useIsAdmin`.

Player updates are further restricted by `013_player_update_rls.sql`: only admins or the user linked to that player through `profiles.player_id` can update a player row.

Session label (name) updates are enforced by the `trg_restrict_bwf_session_label` trigger (`014_restrict_bwf_session_label.sql`): only admins can rename a session, and no one can rename a session that has a `bwf_tournament_id` (those sessions derive their display name from the tournament record).

Session attendance rows are managed through `017_session_attendances.sql`: authenticated users can read all attendance rows, while inserts/updates/deletes are limited to admins or the auth profile linked to the target `player_id`.

Risky lifecycle actions use shared confirmation dialogs before mutation. Ending a session warns when live matches remain, deleting an ended session with matches warns about removing history/ranking data, and deleting live/completed matches warns about score and win/loss removal.

## Key Files

| File | Role |
|------|------|
| src/lib/supabase.ts | Supabase client initialization |
| src/contexts/AuthContext.tsx | Auth state management |
| src/hooks/useMatches.ts | Match CRUD with optimistic updates |
| src/hooks/usePlayers.ts | Player CRUD |
| src/hooks/useSessionAttendances.ts | Session RSVP query/upsert/delete hooks |
| src/hooks/useBackup.ts | Admin JSON export of core app tables |
| src/hooks/useIsAdmin.ts | Admin role check from current user's profile |
| src/i18n.tsx | Locale provider, copy dictionary, and translation helper |
| vite.config.ts | PWA + React plugin configuration |
