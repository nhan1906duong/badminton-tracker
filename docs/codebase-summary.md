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
| 234 | App.tsx | Router, frosted glass header, bottom nav |
| 218 | hooks/useMatches.ts | Match CRUD + useMatch(id) + useUpdateMatch() + useDeleteMatch() |
| 191 | pages/SessionDetailPage.tsx | Session detail: active players + match list + end session |
| 152 | pages/EditMatchPage.tsx | Edit match: result + scores |
| 149 | components/ScoreEntry.tsx | Per-set score inputs + winner picker |
| 145 | components/PlayerSelector.tsx | Unified 2-column grid with Team A/B |
| 136 | pages/SessionMatchResultPage.tsx | Step 2: scores + winner (session-scoped) |
| 124 | components/TeamAssignment.tsx | Team A/B display with shuffle |
| 119 | pages/SessionMatchPlayersPage.tsx | Step 1: match type + player selection (session-scoped) |
| 112 | pages/LoginPage.tsx | OTP email login flow |
| 199 | pages/PlayersPage.tsx | Player list + swipe-to-delete + add modal |
| 93 | contexts/AuthContext.tsx | Supabase auth state management |
| 93 | components/MatchCard.tsx | Match list card component |
| 87 | hooks/useSessions.ts | Session CRUD + useOpenSession() |
| 85 | stores/new-match-store.ts | Zustand store for match creation flow |
| 84 | hooks/usePlayers.ts | Player CRUD hooks |
| 82 | types/database.ts | TypeScript types for all entities |
| 81 | components/PlayerForm.tsx | Add player modal |
| 74 | pages/HomePage.tsx | Stats cards + recent matches |
| 67 | pages/CreateSessionPage.tsx | Create new session |
| 56 | pages/SessionsListPage.tsx | List all sessions |
| 53 | lib/match-helpers.ts | Helper functions for match logic |
| 46 | stores/session-store.ts | Zustand + localStorage for session active players |
| 37 | components/MatchTypeSelector.tsx | Match type dropdown selector |
| 32 | components/FloatingActionButton.tsx | Reusable FAB constrained to mobile container |
| 13 | lib/supabase.ts | Supabase client initialization |

## Components

```
components/
├── MatchTypeSelector.tsx    # Match type dropdown selector
├── MatchCard.tsx           # Match list card
├── PlayerSelector.tsx       # Unified 2-column grid with Team A/B
├── PlayerForm.tsx           # Add player modal
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

- **Player:** id, name, email, avatar_url, is_active, created_at, created_by
- **Match:** id, match_type, played_at, notes, created_by, created_at
- **MatchTeam:** id, match_id, team_label (TEAM_A/TEAM_B), is_winner
- **MatchParticipant:** id, match_id, team_id, player_id
- **MatchScore:** id, match_id, set_number, team_a_score, team_b_score

## Match Creation Flow

1. Select type via dropdown → 2. Pick players from unified grid (auto-assign) → 3. Enter scores → 4. Select winner → 5. Save

## Auth Flow

1. Enter email → 2. Supabase sends magic link → 3. User clicks link → 4. OTP verify → 5. Session created