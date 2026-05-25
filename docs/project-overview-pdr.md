# Project Overview & PDR

## Badminton Match Tracker

**Type:** Progressive Web App (PWA) for iOS/Android home screen installation

## Purpose

Track badminton matches, manage players, and view rankings with multi-user support via Supabase authentication.

## Target Users

- Recreational badminton players
- Club/league administrators
- Players wanting to track personal match history

## Key Features

| Feature | Status | Description |
|---------|--------|-------------|
| Authentication | Implemented | Email + password via Supabase |
| Player CRUD | Implemented | Create, list, toggle active status |
| Match Creation | Implemented | Single-page flow: type + players + mode (Now/Schedule/Queue) |
| Unified Player Grid | Implemented | 2-column grid showing Team A/B assignment |
| Auto Team Assignment | Implemented | Players auto-assign to Team A (blue) then Team B (red) |
| Inline Player Add | Implemented | Add player without leaving match flow |
| Score Entry | Implemented | Per-set inputs with auto winner detection |
| End Match Without Winner | Implemented | Live matches can be completed without standings impact |
| Match History | Implemented | List + detail view with all match data |
| Home Dashboard | Implemented | Stats cards + recent matches + PodiumChart top donate |
| Ranking-Synced Session Summaries | Implemented | Session list/detail leaders use the same `player_match_results` source as session stats |
| Bottom Navigation | Implemented | Sessions, Ranking, Settings tabs |
| Avatar Upload | Implemented | Camera/gallery picker, compress, Supabase Storage |
| Default Avatars | Implemented | Deterministic multiavatar from name hash + 10 selectable defaults |
| Avatar Selection Grid | Implemented | 5x2 grid of multiavatar defaults in AvatarPicker bottom sheet |
| Storage Cleanup | Implemented | Automatic deletion of old uploaded photos from Supabase Storage |
| Player Detail Page | Implemented | Route `/players/:playerId` with editable avatar/name, stats, best partner, infinite scroll match history |
| Authenticated Match Operations | Implemented | Signed-in users can start/end sessions and edit match lifecycle/details; deletes remain admin-only |

## Database Schema

```
players ───────────┐
matches ────────────┼── match_teams ──┬─ match_participants ── players
                    │                 │
                    └─ match_scores ──┘

profiles (1:1 with auth.users) ── avatar_url, role, player_id
```

## Match Flow

1. Select match type (singles/doubles) via segmented control
2. Pick Team A/B slots from the player bottom sheet
3. Choose Now, Schedule, or Queue
4. In match detail, record a winner → save scores and ranking rows to Supabase
5. Or end without winner → save score only, excluded from ranking/history aggregates

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **State:** TanStack Query v5
- **Icons:** Lucide React
- **Charts:** Custom SVG (PodiumChart)
- **PWA:** vite-plugin-pwa

## Environment Variables

```env
VITE_SUPABASE_URL=<your-project-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```
