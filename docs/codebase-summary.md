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
| 251 | components/PlayerSelector.tsx | Quick pick (6 cards) + all players + inline add |
| 213 | pages/NewMatchPage.tsx | 3-step match creation wizard |
| 135 | components/ScoreEntry.tsx | Per-set score inputs + winner picker |
| 128 | App.tsx | Router, layout, bottom nav, auth guards |
| 124 | components/TeamAssignment.tsx | Team A/B display with shuffle |
| 119 | hooks/useMatches.ts | CRUD for matches via Supabase |
| 116 | pages/HomePage.tsx | Stats cards + recent matches |
| 112 | pages/LoginPage.tsx | OTP email login flow |
| 103 | pages/PlayersPage.tsx | Player list + filter + add modal |
| 94 | contexts/AuthContext.tsx | Supabase auth state management |
| 84 | hooks/usePlayers.ts | Player CRUD hooks |
| 82 | types/database.ts | TypeScript types for all entities |
| 53 | lib/match-helpers.ts | Helper functions for match logic |

## Components

```
components/
├── MatchTypeSelector.tsx    # 5-type grid selector
├── PlayerSelector.tsx       # Player selection with quick pick
├── PlayerForm.tsx           # Add player modal
├── ScoreEntry.tsx           # Set score inputs
├── TeamAssignment.tsx       # Team display with shuffle
```

## Pages

```
pages/
├── LoginPage.tsx      # /login - OTP auth
├── HomePage.tsx       # / - Dashboard
├── PlayersPage.tsx    # /players - Player list
├── NewMatchPage.tsx   # /matches/new - Create match
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

1. Select type → 2. Pick players → 3. Auto-assign teams → 4. Enter scores → 5. Save

## Auth Flow

1. Enter email → 2. Supabase sends magic link → 3. User clicks link → 4. OTP verify → 5. Session created