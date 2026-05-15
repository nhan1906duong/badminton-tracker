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
| /matches | MatchesPage | Yes |
| /matches/new | NewMatchPage | Yes |
| /matches/:id | MatchDetailPage | Yes |
| * | → / | Redirect |

## Data Flow

```
1. User logs in → Supabase Auth → JWT stored in localStorage
2. API calls include JWT automatically via Supabase client
3. TanStack Query caches responses, invalidates on mutations
4. React components re-render on query changes
```

## Match Creation Sequence

```
1. Select Type via dropdown (MEN_SINGLES, WOMEN_SINGLES, MEN_DOUBLES, WOMEN_DOUBLES, MIXED_DOUBLES)
         ↓
2. Pick Players from 2-column grid (2 for singles, 4 for doubles)
         ↓
3. Auto-Assign Teams (selected order: first players → Team A/blue, remaining → Team B/red)
         ↓
4. Enter Set Scores (optional, tap to add)
         ↓
5. Select Winner (manual selection)
         ↓
6. Save to Supabase (matches + teams + participants + scores)
```

## Authentication Flow

```
1. User enters email → POST /auth/v1/otp
2. Supabase sends magic link to email
3. User clicks link → redirects to app with OTP token
4. App calls verifyOtp → exchanges token for session
5. Session stored, user redirected to home
```

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