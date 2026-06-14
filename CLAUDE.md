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
- `SettingsPage` (`/settings`) and `PointSystemPage` (`/settings/points`) are public (`auth: false`); unauthenticated users tapping the profile row or "Account" are routed to `/login` instead of opening the player picker / account page. "Recalculate all ratings" is only rendered when signed in.

### Navigation & Back Button

Routes in `src/components/AnimatedRoutes.tsx`. Page transitions are animated (forward/backward) except between tab routes.

**Tab routes** (no AppBar, bottom nav visible): `/sessions`, `/ranking`, `/settings`

**Re-tap current tab**: Tapping the already-active tab scrolls to the top of the page and invalidates all TanStack Query cache (triggers a background refetch). Implemented in `NavButton` in `src/App.tsx`.

**Back navigation**: All sub-page routes use `navigate(-1)` via the `AppBar` component. No custom back-routing logic in `App.tsx`.

**PWA long-press**: `-webkit-touch-callout: none` on `html` in `src/index.css` suppresses the iOS callout menu on long-press.

### Match Creation Flow (single-page)

At `/sessions/:id/matches/new` (`CreateMatchPage`):
1. Pick match type (segmented chip selector)
2. Fill player slots (Team A / Team B) via bottom-sheet player picker
3. Choose **When**: Now (LIVE), Schedule (SCHEDULED + datetime), or Queue (SCHEDULED + queue_position)
4. Save → `navigate(-1)` back to session detail

`CreateMatchPage` is orchestration-only; the screen is composed from focused subcomponents in `src/components/match-create/`: `PlayerSlotsCard` (team headers + slots, uses `<Avatar>`), `WhenPanel` (Now/Schedule/Queue), `LeagueTeamSelectors` (bottom-sheet team picker for league sessions), `ShufflePickerSheet` (owns shuffle selection + logic), `PlayerPickerSheet`, and shared date `helpers.ts`. The bottom CTA is two-line (primary verb + secondary meta).

After a match is created, tap it from session detail to open `MatchDetailPage`:
- Start (SCHEDULED → LIVE), Record Result (LIVE → COMPLETED with winner), End Match (LIVE → COMPLETED without winner), Reopen (COMPLETED → LIVE)
- Edit Players → `EditPlayersPage` (`/matches/:matchId/players/edit`)

### Data Model

Supabase PostgreSQL. Key tables: `players`, `sessions`, `matches`, `match_teams`, `match_participants`, `match_scores`, `profiles` (1:1 with auth.users, includes `role: 'admin' | 'user'` and `player_id` FK linking the auth user to a player row), `bwf_tournaments`, `player_rackets`, `player_quotes`.

A player's `active_racket_id` (FK to `player_rackets`, settable via the star toggle on `PlayerRacketHeaderCard` / `PlayerRacketsCard`) determines which racket's `mascot_id` is shown as that player's mascot — see `src/lib/mascots.ts`.

A match has:
- 2 teams (`match_teams`: TEAM_A / TEAM_B, `is_winner` flag)
- N participants (`match_participants` linking players to teams)
- M scores (`match_scores` per set)

Only completed matches with a winning team count toward rankings, donations, player history, head-to-head stats, and partner stats. Completed no-winner matches keep their saved score but clear `player_match_results`.

A session has `label`, `started_at`, `ended_at`, `bwf_tournament_id` (FK to `bwf_tournaments`), `type` (`'regular' | 'tournament' | 'league'`), `league_match_type`, and `league_total_rounds`. Multiple sessions with different tournaments (or no tournament) can be open simultaneously. Creating a session with a `bwf_tournament_id` that already has a session is blocked at both the app layer (`DuplicateTournamentError`) and the DB layer (partial unique index).

League sessions use a round-robin schedule: fixtures are auto-generated by `useCreateLeagueSchedule` (in `useMatches.ts`) keyed on `league_round`. Any authenticated user can add a new round via the ⋮ menu on a live league session — this increments `league_total_rounds` via `useUpdateLeagueTotalRounds` and resets the schedule-generation ref so the `useEffect` in `SessionDetailPage` creates the new round's fixtures.

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
| `src/components/LoginAffordance.tsx` | Pill-shaped "Sign in" chip rendered next to the page title on tab routes when the user is unauthenticated. Single source for the login entry point — do not re-implement inline. |
| `src/hooks/useSessions.ts` | Session CRUD + open session query; `useRenameSession` (admin-only, blocked for BWF-linked sessions by `trg_restrict_bwf_session_label` trigger); `useUpdateLeagueTotalRounds` (increments round count for league sessions, available to all authenticated users) |
| `src/hooks/useBwfTournaments.ts` | Read BWF tournament cache from Supabase; filter by date window |
| `src/hooks/useRankings.ts` | Elo-based player rankings + shared per-session leaderboard hooks; session leaderboard sorts by `weeklyPoints` (total) then `averageWeeklyPoints` as tiebreaker; exports `computeRankChanges` (pure fn, tested) — computes per-player rank-change vs previous session using all 4 sort criteria as tiebreakers; exports `computeSessionRankingHistory` (pure fn, tested) + `useSessionMatchResults` — computes per-match cumulative ranking history used by `SessionRankingChart` |
| `src/hooks/useMenDoublesRankings.ts` | Computes MD pair rankings (win rate → wins → matches played) from ended sessions only; exports `computeMenDoublesRankings` (pure fn, tested) |
| `src/hooks/useH2HPairs.ts` | Exact-composition 2v2 head-to-head: exports `computeH2HPairs` (pure fn, tested) + `useH2HPairs` hook; handles both normal and reversed team orientations |
| `src/components/HeadToHeadTab.tsx` | "Compare Teams" UI rendered by `HeadToHeadPage` (`/players/:playerId/head-to-head`, reached via the ⋮ menu on `PlayerDetailPage`): 2-slot player picker per side, half-circle win-% gauge, win counts, match history (via `PlayerMatchHistoryItem`); accepts `initialPlayerId` to pre-fill Team A's first slot |
| `src/pages/HeadToHeadPage.tsx` | `/players/:playerId/head-to-head` — full-page wrapper (`<AppBar>` + back action) around `HeadToHeadTab` |
| `src/components/CalendarTab.tsx` | Calendar tab on SessionsPage: vertical timeline of completed sessions grouped by month/day; champion Avatar + card with BWF badge, match count, and champion win % footer |
| `src/hooks/useIsAdmin.ts` | Returns `true` if the current user's profile role is `'admin'` |
| `src/hooks/useProfile.ts` | Fetch user profile (`avatar_url`, `role`, `player_id`); `useUpdatePlayerLink` mutation to link/unlink a player |
| `src/hooks/usePlayerBadges.ts` | Computes record-holder badges for a player across 5 categories: world titles (BWF sessions only), most played, best streak, dynasty (consecutive session wins — only shown when count > 1), most donated. Each badge is only awarded to the current leader(s) across all players. |
| `src/lib/badge-categories.ts` | `CATEGORY_ICON` / `CATEGORY_COLOR` maps from `BadgeCategory` to a lucide icon + color token; shared by `PlayerOverviewCard` |
| `src/lib/player-match-row.ts` | `getMatchRow(match, playerId)` — derives win/loss, teammates, opponents, score string, and short match-type label for a completed match from `playerId`'s perspective |
| `src/lib/session-label.ts` | `formatSessionLabel(session, locale)` — session's `label`, or its `started_at` date formatted for the given locale |
| `src/hooks/usePlayerPointsHistory.ts` | Fetches `player_match_results` for a player and groups them into `SessionPointsHistory[]` (session + `MatchPointsEntry[]` with match + points). Used for rating history chart and match points display. |
| `src/components/RatingChart.tsx` | SVG line chart showing Elo rating over sessions, with a filled area under the line. Dots for each session; filled + star marker (★) for sessions the player won. Rendered via `PlayerRankingChartContent` in the ranking-chart bottom sheet on `PlayerDetailPage`. |
| `src/components/SessionRankingChart.tsx` | Multi-player ranking progression chart on `SessionStatsPage` (Chart tab). Smooth Catmull-Rom lines, Pantone color palette, player avatars with gradient glow at latest rank-1 point. Filter buttons (L5/L10/All) and focus/dim legend chips. Uses `computeSessionRankingHistory` data. |
| `src/components/PlayerCardImage.tsx` | Hero background art for `PlayerDetailPage`: 5:4 crop of the player's avatar fading into the page background, or a dim circular avatar watermark for default multiavatar icons / no avatar |
| `src/components/PlayerOverviewCard.tsx` | Overview section on `PlayerDetailPage`: champion/runner-up session rows (tap to jump to that session in match history) grouped under "Champion" / "Runner-up" / "Awards" (record-holder badges via `badge-categories.ts`); `null` if the player has no achievements or badges |
| `src/components/PlayerRankingChartContent.tsx` | Wraps `RatingChart` for the "Ranking Chart" bottom sheet on `PlayerDetailPage`; shows an empty state when fewer than 2 data points |
| `src/components/PlayerVersusList.tsx` | Shared expandable list of win/loss records vs. other players (opponents or partners), each row expanding to per-match `PlayerMatchHistoryItem`s; used by `PlayerOpponentsContent` and `PlayerPartnersContent` |
| `src/components/PlayerOpponentsContent.tsx` | "Opponents" bottom sheet content on `PlayerDetailPage`: wraps `useOpponents` + `PlayerVersusList` |
| `src/hooks/useOpponents.ts` | Per-player win/loss record vs. each opponent faced (completed matches with a winner only); exports `useOpponents(playerId)` |
| `src/components/PlayerPartnersContent.tsx` | Partners bottom sheet content on `PlayerDetailPage`: wraps `useBestPartner` + `PlayerVersusList` |
| `src/components/PlayerMatchHistoryItem.tsx` | Single completed-match row (W/L badge, teammates/opponents, score, match-type) via `getMatchRow`; used in `PlayerDetailPage` match history and `PlayerVersusList` expanded rows |
| `src/hooks/usePlayerRackets.ts` | CRUD for `player_rackets` (max `MAX_RACKETS_PER_PLAYER` = 4 per player, enforced at the app layer); `usePlayerRackets`, `useCreatePlayerRacket`, `useUpdatePlayerRacket`, `useDeletePlayerRacket` — create/update also set the racket's `mascot_id`; delete invalidates the `players` query too (a deleted racket may have been the player's `active_racket_id`) |
| `src/components/PlayerRacketHeaderCard.tsx` | Rackets entry point on `PlayerDetailPage`: header-image card showing the player's **active** racket (`active_racket_id`, falls back to newest), tap to open a bottom sheet listing all rackets — each row shows its mascot preview (via `LottieMascot`) and, when `canEdit`, a star toggle to set/unset it as active — with a "Manage rackets" link to `PlayerRacketsPage` (own profile only) |
| `src/pages/PlayerRacketsPage.tsx` | `/players/:playerId/rackets` — full racket management page: `PlayerRacketsCard` list + `PlayerQuotesCard`, add/edit via `RacketFormSheet` / `QuoteFormSheet`, FAB to add a racket (own profile or admin, up to `MAX_RACKETS_PER_PLAYER`) |
| `src/components/PlayerRacketsCard.tsx` | Rackets list on `PlayerRacketsPage`: lists a player's rackets with mascot preview (via `LottieMascot`), star toggle to set/unset `active_racket_id`, edit (via `RacketFormSheet`) and delete (via `Dialog` confirm) when `canEdit`; highlights the active racket |
| `src/components/RacketFormSheet.tsx` | Bottom-sheet form to add/edit a `PlayerRacket` (brand `SegmentedControl` + real name + nickname + `MascotPicker` for `mascot_id`); `onCreated` receives the new racket's `"{brand} {real_name}"` |
| `src/components/RacketAddedCelebration.tsx` | Full-screen celebration overlay shown after adding a racket on `PlayerRacketsPage`: looping firework Lottie animation + "Congrats {player}, you just added {racket}..." message; dismiss by tapping outside (no button) |
| `src/lib/mascots.ts` | `MASCOTS` registry: each entry has `id`, `name`, `emoji` (fallback glyph) and `lottiePath` (single path or a collection of paths under `public/mascots/`); `getMascot(id)`, `getMascotPreviewPath` (stable, for pickers), `getMascotDisplayPath` (random pick from a collection) |
| `src/lib/mascot-quotes.ts` | `pickMascotQuote(mood, locale, extraQuotes?)` — random idle/win/lose quote from a localized pool; for `idle`, a player's custom `player_quotes` are mixed into the pool |
| `src/components/LottieMascot.tsx` | Renders a `.lottie` animation via `@lottiefiles/dotlottie-react`; renders nothing if the asset fails to load (lazy-loaded everywhere it's used) |
| `src/components/PlayerMascot.tsx` | Renders a player's active mascot (looping Lottie). `speak` shows a `MascotSpeechBubble` with idle chatter (cycling every 6s, mixing in `playerId`'s custom quotes) or a `reaction` ('win'\|'lose') quote; tapping a multi-animation mascot cycles to another random clip |
| `src/components/MascotSpeechBubble.tsx` | Typewriter-effect speech bubble anchored above its relatively-positioned parent |
| `src/components/MascotPicker.tsx` | Bottom-sheet grid picker over `MASCOTS` (+ a "None" option); shows each mascot's preview animation via `LottieMascot` with `emoji` fallback |
| `src/hooks/usePlayerQuotes.ts` | CRUD for `player_quotes` (max `MAX_QUOTES_PER_PLAYER` = 5 per player, `QUOTE_MAX_LENGTH` = 50, enforced at the app layer): `usePlayerQuotes`, `useCreatePlayerQuote`, `useUpdatePlayerQuote`, `useDeletePlayerQuote` |
| `src/components/PlayerQuotesCard.tsx` | Quotes list on `PlayerRacketsPage`: lists a player's custom quotes, edit/delete (via `Dialog` confirm) when `canEdit`, "Add quote" button up to `MAX_QUOTES_PER_PLAYER` |
| `src/components/QuoteFormSheet.tsx` | Bottom-sheet form to add/edit a `PlayerQuote` (single textarea, `QUOTE_MAX_LENGTH` cap with live counter) |
| `src/hooks/useLeagueTeams.ts` | Fetches league teams + their players for a session |
| `src/hooks/useLeagueStandings.ts` | Computes standings (W/L/Pts) from completed league matches |
| `src/components/LeagueStandingsTable.tsx` | Standings table rendered at the top of a league session detail |
| `src/components/LeagueScheduleGrid.tsx` | Round-by-round fixture grid; groups matches by `league_round` |
| `src/components/LeagueTeamEditor.tsx` | Bottom-sheet editor for managing league teams (scheduled sessions only) |
| `src/lib/fair-shuffle.ts` | Cycle-based fair shuffle: `enumerateSplits` (all C(N,4)×3 splits), `generateNextMatch` (cycle filter + 4-tier ranking), `applyMatchResult` (advances cycle + win/play tracking) |
| `src/lib/bwf-api.ts` | BWF category constants + priority order |
| `src/lib/rating.ts` | Elo rating algorithm + SCORING_CONFIG |
| `src/stores/new-match-store.ts` | Match creation flow state |
| `src/types/database.ts` | TypeScript types for all DB tables |
| `docs/design-guidelines.md` | Design system reference |
| `docs/navigation-flow.md` | Full navigation behavior spec |
| `docs/specs/player_rating_and_point_system_spec.md` | Authoritative scoring system spec — update whenever formula changes |

## Scoring System Change Checklist

When changing any bonus tier, penalty value, base point, or session sort order, **all of the following must be updated in the same change**:

| What | Where |
|---|---|
| Formula logic | `src/lib/rating.ts` — tier boundaries, penalty values |
| Unit tests | `src/lib/rating.test.ts` — update expected values for changed tiers |
| Session leaderboard sort | `src/hooks/useRankings.ts` — `buildSessionWeeklyRankings()` sort key |
| Leaderboard sort tests | `src/hooks/__tests__/useRankings.test.ts` |
| Point System UI labels | `src/i18n.tsx` — tier label strings (both `en` and `vi` locales) |
| Point System UI values | `src/pages/PointSystemPage.tsx` — hardcoded penalty values and example points |
| Spec doc | `docs/specs/player_rating_and_point_system_spec.md` — tables, example calculation |

**Recalculation is automatic**: `useRecalculateAllRatings()` and `useEndSession()` both call `calculateMatchPoints()` directly, so they pick up formula changes with no extra edits.
