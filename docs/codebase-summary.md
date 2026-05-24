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
| 1060 | pages/DesignSystemPage.tsx | Dev-only design tokens & component catalogue |
| 917 | pages/CreateMatchPage.tsx | Single-page match creation: type, players, mode (Now/Schedule/Queue) |
| 906 | pages/MatchDetailPage.tsx | Match detail: start, record result, edit players, reopen, delete |
| 636 | pages/CreateSessionPage.tsx | Create session + BWF tournament picker |
| 635 | pages/PlayerDetailPage.tsx | Player detail: edit avatar/name, stats, best partner, match history |
| 589 | hooks/useMatches.ts | Match CRUD + useStartMatch + useRecordResult + useReorderQueue + useReopenMatch + useUpdateMatchPlayers |
| 551 | hooks/useSessions.ts | Session CRUD + useOpenSession() |
| 374 | pages/SessionDetailPage.tsx | Session detail: stats panel, match list, session menu |
| 343 | pages/EditPlayersPage.tsx | Edit match players: reassign slots for an existing match |
| 332 | pages/SessionStatsPage.tsx | Per-session weekly stats: points, wins, losses per player |
| 300 | components/PodiumChart.tsx | SVG podium chart for top-5 rankings with avatars |
| 232 | hooks/useRankings.ts | usePlayerRankings (Elo) + useSessionWeeklyRankings |
| 217 | pages/RankingPage.tsx | Player rankings by Elo rating (`/ranking`) |
| 210 | pages/PointSystemPage.tsx | Point system explanation (`/settings/points`) |
| 208 | pages/SettingsPage.tsx | Profile, avatar upload, logout, dev tools |
| 203 | components/AnimatedRoutes.tsx | All routes, auth guard, page transition animations |
| 192 | pages/SessionsListPage.tsx | List all sessions |
| 149 | components/ScoreEntry.tsx | Per-set score inputs + winner picker |
| 138 | components/AvatarPicker.tsx | Bottom sheet: 2x5 default avatar grid + camera / gallery / remove photo |
| 135 | hooks/useAvatarUpload.ts | Avatar upload/delete/set-default mutations for Supabase Storage |
| 127 | components/TeamAssignment.tsx | Team slot assignment UI for match creation |
| 127 | components/MatchesContent.tsx | Match list renderer (loading / error / empty states) |
| 119 | pages/LoginPage.tsx | OTP email login flow |
| 8 | hooks/useIsAdmin.ts | Returns true if the current user's profile role is 'admin' |
| 111 | hooks/usePlayerStats.ts | Player win/loss statistics + useSessionDonationStats |
| 104 | types/database.ts | TypeScript types for all entities including MatchStatus |
| 102 | hooks/useBestPartner.ts | Compute best doubles partner from match history |
| 100 | lib/rating.ts | Elo rating algorithm + SCORING_CONFIG constants |
| 91 | components/PlayerSelector.tsx | Bottom-sheet player picker with search |
| 90 | hooks/usePlayers.ts | Player CRUD hooks |
| 87 | components/FloatingActionButton.tsx | Reusable FAB constrained to mobile container |
| 83 | components/PlayerForm.tsx | Add player modal |
| 70 | components/MatchTypeSelector.tsx | Segmented chip selector for match type |
| 69 | lib/match-helpers.ts | Helper functions for match logic (getTeamSize, MATCH_TYPE_SHORT, etc.) |
| 69 | pages/SessionDonatedListPage.tsx | Sorted donor list for a session (`/sessions/:id/donated`) |
| 68 | hooks/useBwfTournaments.ts | Read BWF tournament cache from Supabase; filter by date window |
| 61 | stores/new-match-store.ts | Zustand store for match creation flow (matchType, teamA/B, mode, scheduledAt) |
| 59 | hooks/usePlayerMatchHistory.ts | Paginated match history for a player (cursor-based) |
| 50 | lib/image.ts | Canvas-based image compression utility (center-crop → square → JPEG) |
| 47 | lib/session-format.ts | `formatSessionDuration` utility |
| 46 | components/DonorListItem.tsx | Row for SessionDonatedListPage (avatar + losses + match count) |
| 45 | hooks/usePlayerMatches.ts | Paginated match history for a player (infinite scroll) |
| 45 | hooks/useHeadToHead.ts | Head-to-head stats between two players |
| — | design-system/components/avatar.tsx | Rectangle avatar: accent bg, 2-letter initials, image support |
| 2 | components/Avatar.tsx | Re-export shim → design-system/components/avatar.tsx |
| 13 | lib/supabase.ts | Supabase client initialization |
| 9 | lib/currency.ts | `formatCurrency` + `LOSS_PENALTY_VND` constant |
| 17 | lib/avatar.ts | Deterministic default avatar from name hash |
| 7 | lib/player-name.ts | Player display-name formatter (`Danh Nguyen` → `Danh N.`) |

## Components

```
components/
├── Avatar.tsx               # Re-export shim → design-system/components/avatar.tsx
├── AvatarPicker.tsx         # Bottom sheet: 2x5 default grid + camera / gallery / remove
├── DonorListItem.tsx        # Row for SessionDonatedListPage
├── FloatingActionButton.tsx # Reusable FAB anchored to mobile container
├── MatchCard.tsx            # Match list card
├── MatchesContent.tsx       # Match list renderer (loading / error / empty states)
├── MatchTypeSelector.tsx    # Segmented chip selector for match type
├── PlayerForm.tsx           # Add player modal
├── PlayerSelector.tsx       # Bottom-sheet player picker with search
├── PodiumChart.tsx          # SVG podium chart for top-5 rankings
├── ScoreEntry.tsx           # Set score inputs
├── TeamAssignment.tsx       # Team slot assignment UI for match creation
```

## Pages

```
pages/
├── LoginPage.tsx                # /login - email+password auth
├── PlayerDetailPage.tsx         # /players/:playerId - avatar/name edit (admin), stats, best partner, match history
├── SessionsListPage.tsx         # /sessions - Session history
├── CreateSessionPage.tsx        # /sessions/new - Create session
├── SessionDetailPage.tsx        # /sessions/:id - Session detail (stats panel + matches)
├── SessionStatsPage.tsx         # /sessions/:id/stats - Weekly stats per player
├── SessionDonatedListPage.tsx   # /sessions/:id/donated - Sorted donor list
├── CreateMatchPage.tsx          # /sessions/:id/matches/new - Create match (type + players + mode)
├── MatchDetailPage.tsx          # /sessions/:id/matches/:matchId - Match detail + actions
├── EditPlayersPage.tsx          # /sessions/:id/matches/:matchId/players/edit - Reassign match players
├── RankingPage.tsx              # /ranking - Player rankings by Elo
├── SettingsPage.tsx             # /settings - Profile, logout, dev tools
├── PointSystemPage.tsx          # /settings/points - Point system explanation
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

- **Profile:** id, avatar_url, updated_at, role (`'admin' | 'user'`) (1:1 with auth.users)
- **Player:** id, name, email, avatar_url, is_active, created_at, created_by
- **MatchStatus:** `'SCHEDULED' | 'LIVE' | 'COMPLETED'`
- **Match:** id, session_id, match_type, played_at, notes, status, queue_position, created_by, created_at
- **MatchTeam:** id, match_id, team_label (TEAM_A/TEAM_B), is_winner
- **MatchParticipant:** id, match_id, team_id, player_id
- **MatchScore:** id, match_id, set_number, team_a_score, team_b_score

## Hooks

```
hooks/
├── useAuth.ts              # Supabase auth state
├── useAvatarUpload.ts      # Upload/delete/set-default avatar to Supabase Storage
├── useBestPartner.ts       # Compute best doubles partner from match history
├── useBwfTournaments.ts    # Read BWF tournament cache; filter by date window
├── useHeadToHead.ts        # Head-to-head stats between two players
├── useMatches.ts           # Match CRUD: useMatches, useMatch, useCreateMatch,
│                           #   useUpdateMatch, useDeleteMatch, useStartMatch,
│                           #   useRecordResult, useReorderQueue, useReopenMatch,
│                           #   useUpdateMatchPlayers
├── usePlayerMatchHistory.ts # Cursor-based paginated match history for a player
├── usePlayerMatches.ts     # Infinite-scroll paginated match history for a player
├── usePlayers.ts           # Player CRUD operations
├── usePlayerStats.ts       # Player win/loss statistics + useSessionDonationStats
├── useIsAdmin.ts           # Returns true if the current user's profile role is 'admin'
├── useProfile.ts           # Fetch user profile (avatar_url, role)
├── useRankings.ts          # usePlayerRankings (Elo) + useSessionWeeklyRankings
├── useSessions.ts          # Session CRUD + useOpenSession()
├── useTopJoinedPlayers.ts  # Top-N players by matchesPlayed (default selection)
```

## Lib

```
lib/
├── supabase.ts        # Supabase client initialization
├── image.ts           # Canvas-based image compression (center-crop → square → JPEG)
├── avatar.ts          # Multiavatar utilities (SVG generation, URL helpers)
├── match-helpers.ts   # Match logic helpers (getTeamSize, MATCH_TYPE_SHORT, etc.)
├── player-name.ts     # Short player display names outside profile pages
├── currency.ts        # formatCurrency + LOSS_PENALTY_VND
├── rating.ts          # Elo rating algorithm + SCORING_CONFIG constants
├── session-format.ts  # formatSessionDuration utility
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
1. Tap avatar → AvatarPicker opens (2x5 default avatar grid / camera / gallery / remove)
2. Select default avatar → useSetDefaultAvatar() → cleanupOldAvatar() → update DB
   OR Select image → compressImage(file, 200) → center-crop to 200x200 JPEG
3. Upload to Supabase Storage: avatars/{entity}/{id}.jpg
4. Update DB: profiles.avatar_url (users) or players.avatar_url (players)
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
2. **Players** — slot-based card (Team A slots / VS / Team B slots); tap a slot → bottom sheet player picker with search
3. **When** — 3-way segmented control:
   - **Now** — match inserted as `LIVE`; blocks if a live match already exists (inline error)
   - **Schedule** — match inserted as `SCHEDULED` with a custom date/time; quick-pick buttons (15 min / 30 min / 1 hr)
   - **Queue** — match inserted as `SCHEDULED` with `queue_position = current max + 1`; shows queue chain preview

CTA is disabled until all player slots are filled and (for Schedule mode) a date/time is set.
After save: `navigate(-1)` back to session detail.

## Match Detail Flow

`MatchDetailPage` at `/sessions/:id/matches/:matchId`:

- **SCHEDULED** matches: Start button → transitions to `LIVE`
- **LIVE** matches: Record Result → score entry + winner selection → `COMPLETED`
- **COMPLETED** matches: Reopen → back to `LIVE`; Edit Players → `EditPlayersPage`
- All states: Delete match (with confirmation)
- ⋮ menu (bottom sheet) for actions

## Match Statuses

| Status | Description |
|---|---|
| `LIVE` | In progress — at most 1 per session (enforced by DB unique partial index) |
| `SCHEDULED` | Queued; ordered by `queue_position` |
| `COMPLETED` | Finished; has scores and a winning team |

## Session Donations

Each loss = 5,000 VND penalty (`LOSS_PENALTY_VND` in `lib/currency.ts`).
`useSessionDonationStats(sessionId)` aggregates losses + returns donor list
(players with ≥1 loss, sorted desc by losses).

- SessionDetailPage renders a "Total Donated" panel when `totalLosses > 0`; tap navigates to `/sessions/:id/donated`.
- SessionDonatedListPage shows a sorted list: Avatar + Name on left, `N Losses` (yellow, bold) + `M matches joined` on the right.

## Auth Flow

1. Enter email + password → 2. `supabase.auth.signInWithPassword` → 3. Session created → 4. Redirected to original route
