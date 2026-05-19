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
| 518 | pages/DesignSystemPage.tsx | Dev-only design tokens & component catalogue |
| 305 | components/PodiumChart.tsx | SVG podium chart for top-5 rankings with avatars |
| 270 | App.tsx | Router, frosted glass header, bottom nav |
| 226 | pages/PlayersPage.tsx | Player list + swipe-to-delete + avatar upload |
| 218 | hooks/useMatches.ts | Match CRUD + useMatch(id) + useUpdateMatch() + useDeleteMatch() |
| 168 | pages/SessionDetailPage.tsx | Session detail: ActivePlayersEditor + donation panel + match list |
| 152 | pages/EditMatchPage.tsx | Edit match: result + scores |
| 149 | components/ScoreEntry.tsx | Per-set score inputs + winner picker |
| 145 | components/PlayerSelector.tsx | Unified 2-column grid with Team A/B + avatars |
| 141 | components/ActivePlayersBottomSheet.tsx | Virtualized bottom sheet (`@tanstack/react-virtual`) for adding active players |
| 136 | pages/SessionMatchResultPage.tsx | Step 2: scores + winner (session-scoped) |
| 127 | pages/HomePage.tsx | Stats cards + recent matches + PodiumChart |
| 130 | pages/SettingsPage.tsx | Profile, avatar upload, logout, dev tools |
| 124 | components/TeamAssignment.tsx | Team A/B display with shuffle |
| 119 | pages/SessionMatchPlayersPage.tsx | Step 1: match type + player selection (session-scoped) |
| 112 | pages/LoginPage.tsx | OTP email login flow |
| 110 | hooks/usePlayerStats.ts | Player stats (optional sessionId) + `useSessionDonationStats` |
| 104 | pages/CreateSessionPage.tsx | Create session + pick active players (top-5 default) |
| 96 | components/ActivePlayersEditor.tsx | Chip list + Add CTA, wraps `ActivePlayersBottomSheet` |
| 93 | contexts/AuthContext.tsx | Supabase auth state management |
| 93 | components/MatchCard.tsx | Match list card component |
| 134 | hooks/useAvatarUpload.ts | Avatar upload/delete/set-default mutations for Supabase Storage |
| 87 | hooks/useSessions.ts | Session CRUD + useOpenSession() |
| 86 | components/AvatarPicker.tsx | Bottom sheet: 2x5 default avatar grid + camera / gallery / remove photo |
| 85 | stores/new-match-store.ts | Zustand store for match creation flow |
| 84 | pages/SessionDonatedListPage.tsx | Sorted donor list for a session (`/sessions/:id/donated`) |
| 84 | hooks/usePlayers.ts | Player CRUD hooks |
| 82 | types/database.ts | TypeScript types for all entities |
| 81 | components/PlayerForm.tsx | Add player modal |
| 67 | pages/CreateSessionPage.tsx | Create new session |
| 63 | components/Avatar.tsx | Circle avatar with fallback chain |
| 56 | pages/SessionsListPage.tsx | List all sessions |
| 53 | lib/match-helpers.ts | Helper functions for match logic |
| 50 | lib/image.ts | Canvas-based image compression utility |
| 46 | stores/session-store.ts | Zustand + localStorage for session active players |
| 37 | components/MatchTypeSelector.tsx | Match type dropdown selector |
| 32 | components/FloatingActionButton.tsx | Reusable FAB constrained to mobile container |
| 20 | hooks/useProfile.ts | Fetch user profile from profiles table |
| 17 | lib/avatar.ts | Deterministic default avatar from name hash |
| 13 | lib/supabase.ts | Supabase client initialization |
| 9 | lib/currency.ts | `formatCurrency` + `LOSS_PENALTY_VND` constant |

## Components

```
components/
├── Avatar.tsx               # Circle avatar: src → initial letter fallback
├── AvatarPicker.tsx         # Bottom sheet: 2x5 default grid + camera / gallery / remove
├── ActivePlayersEditor.tsx  # Controlled chip list + Add CTA (wraps bottom sheet)
├── ActivePlayersBottomSheet.tsx  # Virtualized add-players sheet (multi-select)
├── MatchTypeSelector.tsx    # Match type dropdown selector
├── MatchCard.tsx           # Match list card
├── PlayerSelector.tsx       # Unified 2-column grid with Team A/B + avatars
├── PlayerForm.tsx           # Add player modal
├── PodiumChart.tsx          # SVG podium chart for top-5 rankings
├── ScoreEntry.tsx           # Set score inputs
├── TeamAssignment.tsx       # Team display with shuffle
├── FloatingActionButton.tsx # Reusable FAB anchored to mobile container
```

## Pages

```
pages/
├── LoginPage.tsx                # /login - OTP auth
├── HomePage.tsx                 # / - Dashboard
├── PlayersPage.tsx              # /players - Player list
├── SessionsListPage.tsx         # /sessions - Session history
├── CreateSessionPage.tsx        # /sessions/new - Create session
├── SessionDetailPage.tsx        # /sessions/:id - Session detail
├── SessionMatchPlayersPage.tsx  # /sessions/:id/matches/new - Step 1
├── SessionMatchResultPage.tsx   # /sessions/:id/matches/new/result - Step 2
├── EditMatchPage.tsx            # /sessions/:id/matches/:matchId/edit
├── SessionDonatedListPage.tsx   # /sessions/:id/donated - Sorted donor list
├── SettingsPage.tsx             # /settings - Profile, logout, dev tools
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

- **Profile:** id, avatar_url, updated_at (1:1 with auth.users)
- **Player:** id, name, email, avatar_url, is_active, created_at, created_by
- **Match:** id, match_type, played_at, notes, created_by, created_at
- **MatchTeam:** id, match_id, team_label (TEAM_A/TEAM_B), is_winner
- **MatchParticipant:** id, match_id, team_id, player_id
- **MatchScore:** id, match_id, set_number, team_a_score, team_b_score

## Hooks

```
hooks/
├── useAuth.ts            # Supabase auth state
├── useAvatarUpload.ts    # Upload/delete/set-default avatar to Supabase Storage
├── useMatches.ts         # Match CRUD operations
├── usePlayers.ts         # Player CRUD operations
├── usePlayerStats.ts     # Player win/loss statistics
├── useProfile.ts         # Fetch user profile (avatar_url)
├── useSessions.ts        # Session CRUD + useOpenSession()
├── useTopJoinedPlayers.ts # Top-N players by matchesPlayed (used for default selection)
```

## Lib

```
lib/
├── supabase.ts      # Supabase client initialization
├── image.ts         # Canvas-based image compression (center-crop → square → JPEG)
├── avatar.ts        # Multiavatar utilities (SVG generation, URL helpers)
├── match-helpers.ts # Match logic helpers
├── currency.ts      # formatCurrency + LOSS_PENALTY_VND
```

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

```
User has avatar_url?
  → Yes (custom upload or selected default): display that image
  → No (null, new player, or deleted): display first letter of name
  → Error loading image: display first letter of name
```

## Match Creation Flow

1. Select type via dropdown → 2. Pick players from unified grid (auto-assign) → 3. Enter scores → 4. Select winner → 5. Save

## Active Players Selection

1. Create Session → top 5 most-joined players auto-selected as chips (via `useTopJoinedPlayers(5)`).
2. Tap a chip to remove that player.
3. Tap **Add active player** → bottom sheet (`ActivePlayersBottomSheet`) opens with virtualized list (`@tanstack/react-virtual`) of remaining roster.
4. Multi-pick via circle indicators → **Add (N)** button commits → chips appended.
5. On Start, selections are written to `useSessionStore.setPlayers(sessionId, ids)`.
6. SessionDetailPage uses the same `ActivePlayersEditor` to edit picks afterwards.

## Session Donations

Each loss = 5,000 VND penalty (`LOSS_PENALTY_VND` in `lib/currency.ts`).
`useSessionDonationStats(sessionId)` aggregates losses + returns donor list
(players with ≥1 loss, sorted desc by losses).

- SessionDetailPage renders a "Total Donated" panel between Active Players and
  Matches when `totalLosses > 0`; tap navigates to `/sessions/:id/donated`.
- SessionDonatedListPage shows a sorted list: Avatar + Name on left, `N Losses`
  (yellow, bold) + `M matches joined` on the right.

## Auth Flow

1. Enter email → 2. Supabase sends magic link → 3. User clicks link → 4. OTP verify → 5. Session created