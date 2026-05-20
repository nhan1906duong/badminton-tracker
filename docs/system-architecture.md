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
    │  (OTP)  │    │ PostgreSQL  │   │  (Future) │
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
| / | HomePage | Yes |
| /players | PlayersPage | Yes |
| /players/:playerId | PlayerDetailPage | Yes |
| /sessions | SessionsListPage | Yes |
| /sessions/active | ActiveSessionRedirect | Yes |
| /sessions/new | CreateSessionPage | Yes |
| /sessions/:id | SessionDetailPage | Yes |
| /sessions/:id/matches/new | SessionMatchPlayersPage | Yes |
| /sessions/:id/matches/new/result | SessionMatchResultPage | Yes |
| /sessions/:id/matches/:matchId/edit | EditMatchPage | Yes |
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
1. Create Session (auto-closes previous open session)
         ↓
2. Toggle Active Players (local filter, persisted per device)
         ↓
3. Add Match → Select Type + Players (filtered by active list)
         ↓
4. Enter Set Scores (optional, tap to add)
         ↓
5. Select Winner → Save to Supabase (scoped to session)
         ↓
6. Edit Match later (scores, winner, match type)
         ↓
7. End Session when done
```

## Authentication Flow

```
1. User enters email → POST /auth/v1/otp
2. Supabase sends magic link to email
3. User clicks link → redirects to app with OTP token
4. App calls verifyOtp → exchanges token for session
5. Session stored, user redirected to home
```

## Navigation & Back Button Behavior

### Tab Routes (no back button)

The back button is hidden on the 4 bottom-tab root pages:

| Route | Tab |
|-------|-----|
| `/` | Home |
| `/players` | Players |
| `/sessions` | Sessions |
| `/settings` | Settings |

### Back Routing Rules

| From | Back Action | Notes |
|------|-------------|-------|
| `/sessions/:id/matches/new/result` (Final Result) | → `/sessions/:id/matches/new` (Select Players) | Always, via `replace` |
| `/sessions/:id/matches/new` (Select Players) | → `/sessions/:id` (Session Detail) | Always, via `replace` |
| `/sessions/:id` (Session Detail) | → source tab page | Reads `location.state.from` set by caller |
| Any other page | `navigate(-1)` | Standard browser back |

### Session Detail Return Flow

Pages that navigate **to** Session Detail pass `state: { from: '<route>' }` so the back button knows where to return:

- **Home** → Session Detail: `{ state: { from: '/' } }` → back goes to Home
- **Sessions List** → Session Detail: `{ state: { from: '/sessions' } }` → back goes to Sessions List

If no `from` state is present (e.g. direct URL access), back falls through to `navigate('/')`.

## PWA Configuration

- Service worker for offline caching
- Web app manifest for install prompt
- App icon placeholders in `/public`

## Key Files

| File | Role |
|------|------|
| src/lib/supabase.ts | Supabase client initialization |
| src/contexts/AuthContext.tsx | Auth state management |
| src/hooks/useMatches.ts | Match CRUD with optimistic updates |
| src/hooks/usePlayers.ts | Player CRUD |
| vite.config.ts | PWA + React plugin configuration |