# Navigation Flow

## Route Definitions

All routes are defined in `src/components/AnimatedRoutes.tsx`.

| Route | Component | Auth | Tab |
|-------|-----------|------|-----|
| `/login` | `LoginPage` | No | No |
| `/` | `HomePage` | Yes | Yes |
| `/sessions` | `SessionsListPage` | Yes | Yes |
| `/players` | `PlayersPage` | Yes | Yes |
| `/players/:playerId` | `PlayerDetailPage` | Yes | No |
| `/settings` | `SettingsPage` | Yes | Yes |
| `/settings/design-system` | `DesignSystemPage` | Yes (dev) | No |
| `/sessions/new` | `CreateSessionPage` | Yes | No |
| `/sessions/:id` | `SessionDetailPage` | Yes | No |
| `/sessions/:id/donated` | `SessionDonatedListPage` | Yes | No |
| `/sessions/:id/matches/new` | `SessionMatchPlayersPage` | Yes | No |
| `/sessions/:id/matches/new/result` | `SessionMatchResultPage` | Yes | No |
| `/sessions/:id/matches/:matchId/edit` | `EditMatchPage` | Yes | No |

## Route Types

| Type | Routes | AppBar | Bottom Nav |
|------|--------|--------|------------|
| Tab | `/`, `/sessions`, `/players`, `/settings` | No | Yes |
| Full-screen | `/sessions/new` | No | No |
| Sub-page | all others | Yes | Yes |

Full-screen routes manage their own nav bar (Cancel / title) and sticky bottom CTA. Add new ones to `FULL_SCREEN_ROUTES` in `src/App.tsx`.

## Tab Bar

Four tabs, visible on tab routes only. Hidden on `/login`, full-screen routes, and all sub-routes.

```
┌──────┬──────────┬─────────┬──────────┐
│ Home │ Sessions │ Players │ Settings │
│  /   │/sessions │/players │/settings │
└──────┴──────────┴─────────┴──────────┘
```

## Screen Flow

```
                                    LOGIN
                                   /login
                                      │
                                      │ OTP verified
                                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         TAB SCREENS (4)                              │
├─────────────┬───────────────┬─────────────────┬──────────────────────┤
│             │               │                 │                      │
│    HOME     │   SESSIONS    │    PLAYERS      │     SETTINGS         │
│      /      │   /sessions   │    /players     │     /settings        │
│             │               │                 │                      │
│ Active card │  Session card │   + FAB         │  Design System (dev) │
│   ─────►    │    ─────►     │   ───► modal    │  Clear Data (dev)    │
│   /:id      │    /:id       │   PlayerForm    │  Log Out ──► /login  │
│ No active   │  + FAB        │   AvatarPicker  │  AvatarPicker modal  │
│   ───►      │   ───►        │   ─────►        │                      │
│ /sessions/  │ /sessions/new │ /players/:id    │                      │
│    new      │               │ (Player Detail) │                      │
│             │               │                 │                      │
└──────┬──────┴───────┬───────┴─────────────────┴──────────────────────┘
       │              │
       │              │
       ▼              ▼
┌─────────────────────────────────────────┐
│         CREATE SESSION                  │
│         /sessions/new                   │
│                                         │
│  Start Session ──► /sessions/:id  (replace)        │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         SESSION DETAIL                  │
│         /sessions/:id                   │
│                                         │
│  + FAB ──► /matches/new                 │
│  Match card ──► /matches/:id/edit       │
│  Total Donated ──► /donated             │
│  Swipe left ──► Delete modal            │
│  Active Players ──► Inline editor       │
└─────────────────────────────────────────┘
       │
       ├──► /sessions/:id/donated ──► (back)
       │
       ├──► /sessions/:id/matches/new ──► (auto-advance)
       │       │
       │       ▼
       │   ┌─────────────────────────────┐
       │   │  SELECT PLAYERS             │
       │   │  /matches/new               │
       │   │                             │
       │   │  Pick type + players        │
       │   │  Auto-advance when full     │
       │   │  ───► /matches/new/result   │
       │   └─────────────────────────────┘
       │           │
       │           ▼
       │   ┌─────────────────────────────┐
       │   │  MATCH RESULT               │
       │   │  /matches/new/result        │
       │   │                             │
       │   │  Enter scores + winner      │
       │   │  Save ──► back -2 to /:id   │
       │   └─────────────────────────────┘
       │
       └──► /sessions/:id/matches/:matchId/edit
                   │
                   ▼
           ┌─────────────────────────────┐
           │  EDIT MATCH                 │
           │  /matches/:id/edit          │
           │                             │
           │  Edit scores + winner       │
           │  Save ──► back to /:id      │
           └─────────────────────────────┘
```

## Back Navigation

The `AppBar` handles back navigation for sub-page routes. Full-screen routes handle their own back/cancel button.

| From | Back goes to | Handler |
|------|-------------|---------|
| `/sessions/:id/matches/new/result` | `/sessions/:id/matches/new` | AppBar |
| `/sessions/:id/matches/new` | `/sessions/:id` | AppBar |
| `/sessions/:id` | `location.state.from` or browser back | AppBar |
| `/sessions/new` Cancel button | `navigate(-1)` | Page-internal |
| `/sessions/new` (after creating) | Replaced by `/sessions/:id` — back skips create page | `navigate(replace)` |
| Other sub-routes | Browser back | AppBar |

## Auth Guard

Protected routes redirect to `/login` if unauthenticated. After login, user returns to the original route via `location.state`.

## Modals (No Route Change)

| Modal | Triggered from |
|-------|---------------|
| `PlayerForm` | Players page (+ FAB) |
| `AvatarPicker` | Players page, Settings page (avatar tap) |
| Delete confirmation | Players page (swipe), Session detail (swipe match) |
