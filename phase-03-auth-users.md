# Phase 3 — Auth & Users

## Overview
- **Priority**: P0
- **Status**: Pending
- **Description**: Implement user authentication and player profile management.

## Requirements

### Authentication
- Magic link / OTP login (no passwords)
- Users identified by email
- Simple "enter your email, get a code" flow
- Guest mode optional (skip auth, local-only data)

### Player Profiles
- List all players
- Add new player (name, email optional)
- Edit player
- Soft-delete (mark inactive)
- Player detail page

## UI Flow

```
/ (root)
├── /login         → Email input → OTP → redirect to /
├── /players       → List all players + "Add Player" button
├── /players/new   → Create player form
└── /players/:id   → Player detail + edit
```

## Implementation Steps

1. **Auth context/provider** (`src/contexts/AuthContext.tsx`):
   - Wraps app with Supabase auth state listener
   - Provides `user`, `signIn`, `signOut`, `isLoading`

2. **Login page** (`src/pages/LoginPage.tsx`):
   - Email input → `supabase.auth.signInWithOtp()`
   - OTP verification input
   - Resend OTP option

3. **Players list** (`src/pages/PlayersPage.tsx`):
   - Fetch from `players` table
   - Sort by name
   - Show active/inactive badge
   - "Add Player" floating button

4. **Player form** (`src/components/PlayerForm.tsx`):
   - Name (required)
   - Email (optional)
   - Active toggle
   - Used for both create and edit

5. **Route protection**:
   - Redirect unauthenticated users to `/login`
   - After login, redirect back to original route

## Files to Create
- `src/contexts/AuthContext.tsx`
- `src/hooks/useAuth.ts`
- `src/hooks/usePlayers.ts`
- `src/pages/LoginPage.tsx`
- `src/pages/PlayersPage.tsx`
- `src/components/PlayerForm.tsx`
- `src/components/PlayerCard.tsx`

## Success Criteria
- [ ] Can sign up/login with email OTP
- [ ] Can add/edit/list players
- [ ] Auth state persists across reloads
- [ ] Unauthenticated users redirected to login

## Next Steps
- Proceed to [Phase 4 — Match Recording](phase-04-match-recording.md)
