# Navigation Flow

## Route Definitions

All routes are defined in `src/components/AnimatedRoutes.tsx`.

| Route | Component | Auth | Tab |
|-------|-----------|------|-----|
| `/login` | `LoginPage` | No | No |
| `/` | `→ /sessions` (redirect) | Yes | — |
| `/sessions` | `SessionsListPage` | Yes | Yes |
| `/sessions/active` | `ActiveSessionRedirect` | Yes | No |
| `/sessions/new` | `CreateSessionPage` | Yes | No |
| `/sessions/:id` | `SessionDetailPage` | Yes | No |
| `/sessions/:id/stats` | `SessionStatsPage` | Yes | No |
| `/sessions/:id/donated` | `SessionDonatedListPage` | Yes | No |
| `/sessions/:id/matches/new` | `CreateMatchPage` | Yes | No |
| `/sessions/:id/matches/:matchId` | `MatchDetailPage` | Yes | No |
| `/sessions/:id/matches/:matchId/points` | `MatchPointsPage` | Yes | No |
| `/sessions/:id/matches/:matchId/players/edit` | `EditPlayersPage` | Yes | No |
| `/sessions/:id/matches/:matchId/edit` | `LegacyEditMatchRedirect` | Yes | No |
| `/players/:playerId` | `PlayerDetailPage` | Yes | No |
| `/ranking` | `RankingPage` | Yes | Yes |
| `/settings` | `SettingsPage` | Yes | Yes |
| `/settings/points` | `PointSystemPage` | Yes | No |
| `/settings/change-password` | `ChangePasswordPage` | Yes | No |
| `/settings/design-system` | `DesignSystemPage` | Yes (dev) | No |

## Route Types

| Type | Routes | AppBar | Bottom Nav |
|------|--------|--------|------------|
| Tab | `/sessions`, `/ranking`, `/settings` | No | Yes |
| Sub-page | all others (except `/login`) | Yes | No |

## Tab Bar

Three tabs, visible on tab routes only. Hidden on `/login` and all sub-routes.

```
┌──────────┬─────────┬──────────┐
│ Sessions │ Ranking │ Settings │
│/sessions │/ranking │/settings │
└──────────┴─────────┴──────────┘
```

## Screen Flow

```
                                    LOGIN
                                   /login
                                      │
                                      │ Password verified
                                      ▼
┌────────────────────────────────────────────────────┐
│                TAB SCREENS (3)                     │
├────────────────┬───────────────┬───────────────────┤
│                │               │                   │
│   SESSIONS     │   RANKING     │   SETTINGS        │
│   /sessions    │   /ranking    │   /settings       │
│                │               │                   │
│ Session card   │ All tab: Elo  │ Profile summary   │
│   ─────►       │ Session tab:  │ Link Player       │
│   /:id         │ latest session│ Point System ──►  │
│ + FAB          │               │ /settings/points  │
│   ───►         │               │ Change Pwd ──►    │
│ /sessions/new  │               │ /change-password  │
│                │               │ Design Sys (dev)  │
│                │               │ Log Out ──► /login│
│                │               │                   │
└───────┬────────┴───────────────┴───────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│         CREATE SESSION                  │
│         /sessions/new                   │
│                                         │
│  Start Session ──► /sessions/:id  (replace)       │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│         SESSION DETAIL                  │
│         /sessions/:id                   │
│                                         │
│  + FAB ──► /matches/new                 │
│  Stats ──► /stats                       │
│  Match card ──► /matches/:matchId       │
│  Total Donated ──► /donated             │
│  Swipe left ──► Delete modal            │
│  Active Players ──► Inline editor       │
└─────────────────────────────────────────┘
        │
        ├──► /sessions/:id/stats ──► (back)
        │
        ├──► /sessions/:id/donated ──► (back)
        │
        ├──► /sessions/:id/matches/new ──► (back)
        │       Single-page: type, players, mode (Now/Schedule/Queue)
        │       Save ──► navigate(-1) back to /:id
        │
        └──► /sessions/:id/matches/:matchId
                   │
                   ▼
           ┌─────────────────────────────┐
           │  MATCH DETAIL               │
           │  /matches/:matchId          │
           │                             │
           │  View/start/record result   │
           │  Edit players ──► /players/edit │
           │  Reopen / Delete match      │
           │  View Points ──► /points    │
           │    (COMPLETED + winner only)│
           └─────────────────────────────┘
```

## Back Navigation

The `AppBar` component handles back navigation for sub-page routes via `navigate(-1)`.

| From | Back goes to |
|------|-------------|
| `/settings/change-password` | `/settings` |
| `/sessions/:id/matches/:matchId/players/edit` | `/sessions/:id/matches/:matchId` |
| `/sessions/:id/matches/:matchId` | `/sessions/:id` |
| `/sessions/:id/matches/new` | `/sessions/:id` |
| `/sessions/:id/stats` | `/sessions/:id` |
| `/sessions/:id/donated` | `/sessions/:id` |
| `/sessions/:id` | browser back (`navigate(-1)`) |
| `/sessions/new` | browser back |
| Any other sub-route | browser back |

`/sessions/active` redirects to `/sessions/:id` (if open session) or `/sessions/new` (no open session) via `replace`, so it never appears in browser history.

`/sessions/:id/matches/:matchId/edit` is a legacy redirect → `/sessions/:id/matches/:matchId/players/edit`.

## Auth Guard

Protected routes redirect to `/login` if unauthenticated. After login, user returns to the original route via `location.state`.

## Modals (No Route Change)

| Modal | Triggered from |
|-------|---------------|
| `AvatarPicker` | Player Detail page avatar tap |
| Delete confirmation dialog | Session detail (⋮ menu, admin only), Match Detail (⋮ menu, admin only); recorded data uses stronger warning copy |
| End-session warning dialog | Session detail end action; warns when live matches still exist |
| End-match-without-winner dialog | Match detail live action; saves current score but does not create ranking results |
| Bottom sheet (match actions) | Match Detail page (⋮ menu) |
| Score entry sheet | Match Detail page (record result) |
| Player picker bottom sheet | Settings page ("Link to a player") |
| Unlink confirmation | Settings page ("Unlink") |
| Link failure dialog | Settings page when selected player is already linked |
