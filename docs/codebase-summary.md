# Codebase Summary

## Directory Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Route-level page components
├── hooks/              # Custom React hooks
├── contexts/           # React contexts (Auth)
├── lib/                # Utilities and Supabase client
├── types/              # TypeScript definitions
├── App.tsx             # Root component with routing
├── main.tsx            # Entry point
└── index.css           # Tailwind theme variables
```

## Key Files (LOC)

| LOC | File | Purpose |
|-----|------|---------|
| 1092 | i18n.tsx | English/Vietnamese locale provider, dictionary, and translation helper |
| 1091 | pages/DesignSystemPage.tsx | Dev-only design tokens & component catalogue |
| 1208 | pages/CreateMatchPage.tsx | Single-page match creation: type, players, mode (Now/Schedule/Queue), fair shuffle |
| 913 | pages/MatchDetailPage.tsx | Match detail: start, live score, record result, end with no winner, edit players, reopen, delete |
| 820 | pages/PlayerDetailPage.tsx | Player detail: edit avatar/name, stats, best partner, match history, achievements tab |
| 635 | pages/CreateSessionPage.tsx | Create session + BWF tournament picker |
| 639 | hooks/useMatches.ts | Match CRUD + useStartMatch + useRecordResult + useEndMatchNoWinner + useReorderQueue + useReopenMatch + useUpdateMatchPlayers |
| 568 | hooks/useSessions.ts | Session CRUD + useOpenSession() + cached start/end/rename updates |
| 520 | pages/MatchPointsPage.tsx | Completed-match point breakdown by player, score bonus, strength bonus, and Elo delta |
| 400 | pages/SessionDetailPage.tsx | Session detail: recorded-result stats panel, leaderboard MVP, match list, session menu (rename/end/delete), BWF category badge |
| 342 | pages/EditPlayersPage.tsx | Edit match players: reassign slots for an existing match |
| 434 | pages/SessionStatsPage.tsx | Per-session weekly stats: points, wins, losses per player, champion badge |
| 300 | components/PodiumChart.tsx | SVG podium chart for top-5 rankings with avatars |
| 309 | hooks/useRankings.ts | usePlayerRankings (Elo + weekly Top 1 streak) + per-session leaderboard hooks |
| 217 | pages/RankingPage.tsx | Player rankings by Elo rating and current weekly Top 1 streak (`/ranking`) |
| 215 | components/firework-effect.tsx | Canvas firework overlay for champion celebration |
| 210 | pages/PointSystemPage.tsx | Point system explanation (`/settings/points`) |
| 338 | pages/SettingsPage.tsx | Profile, player link/unlink, change password, logout, dev tools |
| 207 | components/AnimatedRoutes.tsx | All routes, auth guard, page transition animations |
| 176 | pages/SessionsListPage.tsx | List all sessions with BWF category badges and leaderboard-synced top player |
| 149 | components/ScoreEntry.tsx | Per-set score inputs + winner picker |
| 138 | components/AvatarPicker.tsx | Bottom sheet: 2x5 default avatar grid + camera / gallery / remove photo |
| 137 | hooks/useAvatarUpload.ts | Avatar upload/delete/set-default mutations for Supabase Storage |
| 127 | components/TeamAssignment.tsx | Team slot assignment UI for match creation |
| 170 | lib/fair-shuffle.ts | Fair shuffle algorithm: priority-based player selection + lowest-score team split |
| 127 | components/MatchesContent.tsx | Match list renderer (loading / error / empty states); exports `sortMatches` (LIVE first → SCHEDULED by queue_position → COMPLETED by ended_at desc) |
| 111 | pages/LoginPage.tsx | Email + password login flow |
| 8 | hooks/useIsAdmin.ts | Returns true if the current user's profile role is 'admin' |
| 111 | hooks/usePlayerStats.ts | Player win/loss statistics + useSessionDonationStats |
| 129 | types/database.ts | TypeScript types for all entities including MatchStatus and PlayerMatchResult |
| 104 | hooks/useBestPartner.ts | Compute best doubles partner from match history |
| 100 | lib/rating.ts | Elo rating algorithm + SCORING_CONFIG constants |
| 91 | components/PlayerSelector.tsx | Bottom-sheet player picker with search |
| 90 | hooks/usePlayers.ts | Player CRUD hooks |
| 87 | components/FloatingActionButton.tsx | Reusable FAB constrained to mobile container |
| 205 | components/PlayerForm.tsx | Add/edit player form with localized validation and actions |
| 70 | components/MatchTypeSelector.tsx | Segmented chip selector for match type |
| 69 | lib/match-helpers.ts | Helper functions for match logic (getTeamSize, MATCH_TYPE_SHORT, etc.) |
| 265 | pages/SessionDonatedListPage.tsx | Sorted donor list for a session (`/sessions/:id/donated`) |
| 68 | hooks/useBwfTournaments.ts | Read BWF tournament cache from Supabase; filter by date window |
| 57 | design-system/components/bwf-category-badge.tsx | Tiered color badge for BWF tournament categories (S1000/S750/S500/S300/S100/Finals) |
| 90 | hooks/usePlayerAchievements.ts | Compute player achievements per session (champion/runner-up ranking) |
| 78 | hooks/usePlayerPointsHistory.ts | Group a player's `player_match_results` by session for future point-history UI |
| 61 | stores/new-match-store.ts | Zustand store for match creation flow (matchType, teamA/B, mode, scheduledAt) |
| 65 | hooks/usePlayerMatchHistory.ts | Paginated match history for a player (cursor-based) |
| 54 | hooks/useBackup.ts | Admin-only JSON export of core Supabase tables |
| 50 | lib/image.ts | Canvas-based image compression utility (center-crop → square → JPEG) |
| 47 | lib/session-format.ts | `formatSessionDuration` utility |
| 46 | components/DonorListItem.tsx | Row for SessionDonatedListPage (avatar + losses + match count) |
| 45 | hooks/usePlayerMatches.ts | Paginated match history for a player (infinite scroll) |
| 50 | hooks/useHeadToHead.ts | Head-to-head stats between two players |
| — | design-system/components/avatar.tsx | Rectangle avatar: accent bg, 2-letter initials, image support |
| 2 | components/Avatar.tsx | Re-export shim → design-system/components/avatar.tsx |
| 13 | lib/supabase.ts | Supabase client initialization |
| 9 | lib/currency.ts | `formatCurrency` + `LOSS_PENALTY_VND` constant |
| 33 | lib/avatar.ts | Multiavatar URL and SVG helpers |
| 18 | hooks/useMatchPlayerResults.ts | Fetch point rows for one completed match |
| 8 | lib/player-name.ts | Player display-name formatter (`Danh Nguyen` → `Danh N.`) |

## Components

```
components/
├── Avatar.tsx               # Re-export shim → design-system/components/avatar.tsx
├── AvatarPicker.tsx         # Bottom sheet: 2x5 default grid + camera / gallery / remove
├── DonorListItem.tsx        # Row for SessionDonatedListPage
├── firework-effect.tsx      # Canvas firework overlay for champion celebration
├── FloatingActionButton.tsx # Reusable FAB anchored to mobile container
├── MatchCard.tsx            # Match list card
├── MatchesContent.tsx       # Match list renderer (loading / error / empty states)
├── MatchTypeSelector.tsx    # Segmented chip selector for match type
├── PlayerForm.tsx           # Add player modal
├── PlayerSelector.tsx       # Bottom-sheet player picker with search
├── PodiumChart.tsx          # SVG podium chart for top-5 rankings
├── ScoreEntry.tsx           # Set score inputs
├── TeamAssignment.tsx       # Team slot assignment UI for match creation

design-system/components/
├── avatar.tsx               # Rectangle avatar with accent bg, 2-letter initials, image support
├── bwf-category-badge.tsx   # Tiered color badge for BWF tournament categories
├── segmented-control.tsx    # Horizontally scrollable tab bar (flex-based, shrink-0 tabs)
```

## Pages

```
pages/
├── LoginPage.tsx                # /login - email + password auth
├── PlayerDetailPage.tsx         # /players/:playerId - avatar/name edit, stats, best partner, match history, achievements
├── SessionsListPage.tsx         # /sessions - Session history with BWF category badges
├── CreateSessionPage.tsx        # /sessions/new - Create session
├── SessionDetailPage.tsx        # /sessions/:id - Session detail (stats panel + matches)
├── SessionStatsPage.tsx         # /sessions/:id/stats - Weekly stats per player
├── SessionDonatedListPage.tsx   # /sessions/:id/donated - Sorted donor list
├── CreateMatchPage.tsx          # /sessions/:id/matches/new - Create match (type + players + mode)
├── MatchDetailPage.tsx          # /sessions/:id/matches/:matchId - Match detail + actions
├── MatchPointsPage.tsx          # /sessions/:id/matches/:matchId/points - Points breakdown
├── EditPlayersPage.tsx          # /sessions/:id/matches/:matchId/players/edit - Reassign match players
├── RankingPage.tsx              # /ranking - Player rankings by Elo
├── SettingsPage.tsx             # /settings - Profile, player link/unlink, change password, logout, dev tools
├── PointSystemPage.tsx          # /settings/points - Point system explanation
├── ChangePasswordPage.tsx       # /settings/change-password - Re-auth then update password
├── DesignSystemPage.tsx         # /settings/design-system - Dev-only design catalogue
```

## Data Flow

```
User Action → Hook (useMatches/usePlayers) → TanStack Query
                                         ↓
                                   Supabase API
                                         ↓
                                   Query Invalidation
                                         ↓
                                   UI Update
```

## Type Definitions

- **Profile:** id, avatar_url, updated_at, role (`'admin' | 'user'`), player_id (nullable FK → players.id — links the auth user to a player row) (1:1 with auth.users)
- **Player:** id, name, email, avatar_url, is_active, rating, created_at, created_by
- **Session:** id, label, started_at, ended_at, created_at, bwf_tournament_id. Joins `bwf_tournaments?: { category_name, category_slug } | null` for badge display.
- **BwfTournament:** id, name, start_date, end_date, category_slug, category_name, venue
- **MatchStatus:** `'SCHEDULED' | 'LIVE' | 'COMPLETED'`
- **Match:** id, session_id, match_type, played_at, notes, status, queue_position, created_by, created_at
- **MatchTeam:** id, match_id, team_label (TEAM_A/TEAM_B), is_winner
- **MatchParticipant:** id, match_id, team_id, player_id
- **MatchScore:** id, match_id, set_number, team_a_score, team_b_score
- **PlayerMatchResult:** id, player_id, match_id, session_id, is_winner, team_score, opponent_score, base_points, attendance_points, score_bonus, strength_bonus, total_weekly_points, rating_before, rating_after, rating_delta, created_at

## Hooks

```
hooks/
├── useAuth.ts              # Supabase auth state
├── useAvatarUpload.ts      # Upload/delete/set-default avatar to Supabase Storage
├── useBackup.ts            # Admin JSON export of core Supabase tables
├── useBestPartner.ts       # Compute best doubles partner from match history
├── useBwfTournaments.ts    # Read BWF tournament cache; filter by date window
├── useHeadToHead.ts        # Head-to-head stats between two players
├── useMatches.ts           # Match CRUD: useMatches, useMatch, useCreateMatch,
│                           #   useUpdateMatch, useDeleteMatch, useStartMatch,
│                           #   useRecordResult, useEndMatchNoWinner,
│                           #   useReorderQueue, useReopenMatch, useUpdateMatchPlayers
├── useMatchPlayerResults.ts # Fetch `player_match_results` rows for a match
├── usePlayerMatchHistory.ts # Cursor-based paginated match history for a player
├── usePlayerMatches.ts     # Infinite-scroll paginated match history for a player
├── usePlayerPointsHistory.ts # Group player point rows by session for future point-history UI
├── usePlayers.ts           # Player CRUD operations
├── usePlayerStats.ts       # Player win/loss statistics + useSessionDonationStats
├── usePlayerAchievements.ts # Compute player achievements per session (champion/runner-up)
├── useIsAdmin.ts           # Returns true if the current user's profile role is 'admin'
├── useProfile.ts           # useProfile (fetch avatar_url, role, player_id) + useUpdatePlayerLink (link/unlink player)
├── useRankings.ts          # Overall Elo rankings + weekly Top 1 streak + session weekly rankings/leaderboards
├── useSessions.ts          # Session CRUD + useOpenSession(); cached start/end/rename mutations
├── useTopJoinedPlayers.ts  # Top-N players by matchesPlayed (default selection)
```

## Lib

```
lib/
├── supabase.ts        # Supabase client initialization
├── image.ts           # Canvas-based image compression (center-crop → square → JPEG)
├── avatar.ts          # Multiavatar utilities (SVG generation, URL helpers)
├── bwf-api.ts         # BWF tournament crawler/cache helper utilities
├── match-helpers.ts   # Match logic helpers (getTeamSize, MATCH_TYPE_SHORT, etc.)
├── player-name.ts     # Short player display names outside profile pages
├── currency.ts        # formatCurrency + LOSS_PENALTY_VND
├── rating.ts          # Elo rating algorithm + SCORING_CONFIG constants
├── session-format.ts  # formatSessionDuration utility
├── utils.ts           # Shared className merge helper
```

## Player Name Display

Canonical formatter: `src/lib/player-name.ts`.

- Full names are stored in `players.name`.
- Full names are shown only on the player profile page (`/players/:playerId`) and in edit/search inputs.
- Other UI surfaces use `formatShortPlayerName(name)`: first word plus initials for the remaining words.
- Examples: `Danh Nguyen` → `Danh N.`, `Nhan Duong Ngoc` → `Nhan D. N.`
- Avatar `name` props intentionally receive the full name for initials and image alt text.

## Avatar Upload Flow

```
1. Tap a player avatar on PlayerDetailPage → AvatarPicker opens (2x5 default avatar grid / camera / gallery / remove)
2. Select default avatar → useSetDefaultAvatar() → cleanupOldAvatar() → update DB
   OR Select image → compressImage(file, 200) → center-crop to 200x200 JPEG
3. Upload to Supabase Storage: avatars/{entity}/{id}.jpg
4. Update DB: players.avatar_url
5. Invalidate queries → UI refreshes with new avatar
```

## Avatar Fallback Chain

Canonical component: `design-system/components/avatar.tsx` (re-exported from `src/components/Avatar.tsx`).

```
User has avatar_url?
  → Yes (custom upload or selected default): display that image
  → No (null, new player, or deleted): display 2-letter initials (first + last word initial)
  → Error loading image: display 2-letter initials

Shape: rectangle (border-radius: var(--radius-md), not circular)
Default bg: var(--accent) · Default text: var(--surface)
```

## Match Creation Flow

Single-page flow at `/sessions/:id/matches/new` (`CreateMatchPage`):

1. **Match type** — segmented chip selector (Men's Singles / Women's Singles / Men's Doubles / Women's Doubles / Mixed Doubles)
2. **Players** — slot-based card (Team A slots / VS / Team B slots); tap a slot → bottom sheet player picker with search. A **Shuffle** button (doubles only) opens a bottom sheet to pick a player pool, then calls `generateNextMatch` from `src/lib/fair-shuffle.ts` to fill all four slots. The player selection in the picker persists across opens — closing and reopening the sheet keeps whatever players were last selected.
3. **When** — 3-way segmented control:
   - **Now** — match inserted as `LIVE`; blocks if a live match already exists (inline error)
   - **Schedule** — match inserted as `SCHEDULED` with a custom date/time; quick-pick buttons (15 min / 30 min / 1 hr)
   - **Queue** — match inserted as `SCHEDULED` with `queue_position = current max + 1`; shows queue chain preview

CTA is disabled until all player slots are filled and (for Schedule mode) a date/time is set.
After save: `navigate(-1)` back to session detail.

## Fair Shuffle (`src/lib/fair-shuffle.ts`)

Available for doubles match types only. The Shuffle button in `CreateMatchPage` opens a player pool picker with a "Select all / Clear" toggle at the top-right. The player selection **persists across opens** — the picker reopens with the same players checked as the last time. First open starts with an empty selection. Pressing "Shuffle" cycles through all possible team splits before repeating.

**Split enumeration**

For a pool of N players, `enumerateSplits` generates every possible doubles split: C(N,4) ways to choose who plays × 3 ways to pair the 4 players = e.g. 3 splits for 4 players, 15 for 5, 45 for 6. Each split has a canonical key via `makeSplitKey` (player IDs sorted within each team, teams sorted lexicographically), so AB|CD === BA|DC === CD|AB.

**Cycle-based filtering (Step 1)**

`cycleUsedSplits` tracks which splits have been used since the current cycle started. Only splits NOT in this set are candidates. When all splits are exhausted the cycle resets and all splits become candidates again. This guarantees every combination plays exactly once per round before any is repeated.

The cycle is maintained **in-memory** as React state (`shuffleCycle` in `CreateMatchPage`), so consecutive shuffle presses — even without saving a match — step to the next unused split. The cycle initialises from session history on the first press or when the selected player pool changes.

**Ranking within candidates (Step 2)**

Candidates are sorted ascending by (lower = better):

| Priority | Criterion |
|---|---|
| 1 | `\|team1Wins − team2Wins\|` for this specific matchup (prefer balanced head-to-head) |
| 2 | `\|Σ sessionWins(team1) − Σ sessionWins(team2)\|` (prefer evenly matched teams) |
| 3 | `−Σ playerPlayed(resting players)` (prefer splits that rest the most-played players) |
| 4 | Random tiebreaker |

**History (`buildSessionHistory` in `CreateMatchPage`)**

Before each shuffle, all **COMPLETED** doubles matches in the session where every participant is in the selected pool are replayed chronologically to reconstruct:
- `splitRecord` — per-split win/loss counts
- `cycleUsedSplits` — which splits are in the current history cycle (used to initialise in-memory state)
- `playerWins` / `playerPlayed` — per-player totals for ranking criteria

Matches involving players outside the current pool are ignored, keeping the cycle and stats pool-specific.

**Key exports**
- `makeSplitKey(team1Ids, team2Ids)` — canonical key for a team split
- `enumerateSplits(players)` — all possible doubles splits for a pool
- `generateNextMatch(input)` — returns the best next split from cycle candidates
- `applyMatchResult(match, winnerTeam, ...)` — advances cycle + updates win/played counts
- `generateMatchSchedule(players, n)` — generates N matches in sequence (used in tests)

## Match Detail Flow

`MatchDetailPage` at `/sessions/:id/matches/:matchId`:

- **SCHEDULED** matches: Start button → transitions to `LIVE`
- **LIVE** matches: Record Result → score entry + winner selection → `COMPLETED`
- **LIVE** matches: End Match → confirmation dialog → `COMPLETED` with no winner; saves current score but clears ranking rows
- **COMPLETED** matches: Reopen → back to `LIVE`; Edit Players → `EditPlayersPage`
- All states: Delete match (with confirmation; live/completed matches show a stronger recorded-data warning)
- ⋮ menu (bottom sheet) for actions
- Start, record, reopen, and edit-player actions are available to any authenticated user; match delete remains admin-only.

## Match Statuses

| Status | Description |
|---|---|
| `LIVE` | In progress — at most 1 per session (enforced by DB unique partial index) |
| `SCHEDULED` | Queued; ordered by `queue_position` |
| `COMPLETED` | Finished; may have a winning team or may be a no-winner completion that is excluded from ranking/history aggregates |

## Ranking-Synced Session Stats

Session summaries now read the same `player_match_results` source as the session stats page:

- `useSessionLeaderboard(sessionId)` returns `{ rankings, leader }` for one session.
- `useSessionLeaderboards()` returns a `Map<sessionId, { rankings, leader }>` for all sessions, used by `SessionsListPage`.
- `SessionDetailPage` and `SessionsListPage` use the leaderboard leader for MVP/top-player display instead of recomputing wins from raw matches.
- Recorded-result counts only include `COMPLETED` matches with at least one `match_teams.is_winner = true`; no-winner completed matches are hidden from stats panels, donations, player history, best partner, and head-to-head aggregates.
- Pull-to-refresh on session list/detail refreshes both matches and leaderboard data.
- `RankingPage` shows current weekly Top 1 streak text beside player names on the all-time tab only when the streak is greater than one active calendar week. The streak is derived from ended sessions grouped by local calendar week and aggregated by `total_weekly_points`.

## Match Points Breakdown

`MatchPointsPage` at `/sessions/:id/matches/:matchId/points` reads `player_match_results` through `useMatchPlayerResults(matchId)` and shows the stored scoring breakdown for completed matches with a winner.

- Match context compares Team A/B average ratings, final score margin, strength bonus, and score bonus.
- Winner and loser team sections list every player with base, attendance, score, strength, total weekly points, and Elo delta.
- `usePlayerPointsHistory(playerId)` groups the same result rows by session for a future player-level point-history UI.

## Safety Confirmations

Shared `Dialog` confirmations are used for risky actions:

- Ending a session while live matches exist shows a warning that those matches should be finished or recorded first if they should count.
- Deleting an ended session with matches warns that match history, scores, and ranking results are permanently removed.
- Ending a live match without a winner explains that the saved score will not declare a winner.
- Deleting a live or completed match warns that scores and win/loss records are permanently removed.

## Session Donations

Each loss = 5,000 VND penalty (`LOSS_PENALTY_VND` in `lib/currency.ts`).
`useSessionDonationStats(sessionId)` aggregates losses + returns donor list
(players with ≥1 loss, sorted desc by losses).

- SessionDetailPage renders a "Total Donated" panel when `totalLosses > 0`; tap navigates to `/sessions/:id/donated`.
- SessionDonatedListPage shows a sorted list: Avatar + Name on left, `N Losses` (yellow, bold) + `M matches joined` on the right.

## BWF Tournament Category Badges

Sessions linked to a BWF tournament display a colored category badge:

| Category | Color | Background |
|---|---|---|
| Finals (grade-2-level-1) | Purple | oklch(55% 0.20 300 / 0.12) |
| S1000 (grade-2-level-2) | Gold | oklch(60% 0.16 85 / 0.15) |
| S750 (grade-2-level-3) | Red | oklch(52% 0.20 25 / 0.10) |
| S500 (grade-2-level-4) | Blue | oklch(50% 0.18 250 / 0.10) |
| S300 (grade-2-level-5) | Green | oklch(50% 0.16 145 / 0.10) |
| S100 (grade-2-level-6) | Gray | oklch(55% 0.05 240 / 0.10) |

- Component: `design-system/components/bwf-category-badge.tsx`
- `useSessions` / `useSession` / `useOpenSession` now join `bwf_tournaments(category_name, category_slug)`
- Badges appear on session cards (`SessionsListPage`) and session detail (`SessionDetailPage`)

## Player Achievements

The Achievements tab on `PlayerDetailPage` shows sessions where the player ranked #1 (champion) or #2 (runner-up):

1. `usePlayerAchievements(playerId)` groups completed matches by session
2. Ranks players per session by wins (desc), then matches played (asc — fewer = better)
3. Only includes players at rank #1 or #2
4. Displays: custom circular rank badge (gold "1" / silver "2"), session name, BWF category badge, match stats (W/L/rate)

- Hook: `src/hooks/usePlayerAchievements.ts`
- Rank badge: custom SVG component inline in `PlayerDetailPage.tsx`
- Tab bar: `SegmentedControl` with horizontal scroll (`flex` + `shrink-0` + `overflow-x: auto`)

## Champion Celebration

`SessionStatsPage` shows a champion badge beside the rank #1 player. If the current auth profile is linked to that player and the session has ended, it renders `FireworkEffect` once per `{sessionId, playerId}` using localStorage key `champion-firework:{sessionId}:{playerId}`.

- Component: `src/components/firework-effect.tsx`
- Trigger page: `/sessions/:id/stats`
- Persistence: localStorage suppresses repeat playback for the same linked player/session pair

## Auth Flow

1. Enter email + password → 2. `supabase.auth.signInWithPassword` → 3. Session created → 4. Redirected to original route

## Link Account (Player ↔ User)

Users can link their auth account to a player row via Settings → "Link to a player". This sets `profiles.player_id` (FK → `players.id`). Managed by `useUpdatePlayerLink` in `useProfile.ts`. Displayed in `SettingsPage` as a bottom-sheet player picker. Unlinking opens a confirmation dialog and sets `player_id` to `null`; failed links show an error dialog when the selected player is already linked to another account.

`013_player_update_rls.sql` uses this link for player updates: only admins or the linked user can update a player row.

## Locale & Admin Backup

- `src/i18n.tsx` provides `LocaleProvider`, `useI18n()`, and `translate()` for English/Vietnamese UI copy.
- Settings exposes the language switch and persists the selected locale client-side.
- Admins see a Backup Data action powered by `useBackupData()`, exporting players, sessions, matches, teams, participants, scores, and `player_match_results` as JSON.

## Permissions

- Any authenticated user can start/end sessions and edit match lifecycle/detail rows (`matches`, `match_teams`, `match_participants`, `match_scores`).
- Player avatar/name updates are limited to admins or the auth user linked to that player via `profiles.player_id`.
- Delete actions remain admin-only through RLS and admin-gated UI.

## Change Password Flow

At `/settings/change-password` (`ChangePasswordPage`):
1. Enter current password — verified via `supabase.auth.signInWithPassword` (re-auth)
2. Enter new password + confirm
3. Call `supabase.auth.updateUser({ password })` on success
