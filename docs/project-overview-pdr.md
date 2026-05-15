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
| OTP Authentication | Implemented | Email magic link via Supabase |
| Player CRUD | Implemented | Create, list, toggle active status |
| Match Creation | Implemented | 2-step flow: type+players → scores+save |
| Unified Player Grid | Implemented | 2-column grid showing Team A/B assignment |
| Auto Team Assignment | Implemented | Players auto-assign to Team A (blue) then Team B (red) |
| Inline Player Add | Implemented | Add player without leaving match flow |
| Score Entry | Implemented | Per-set inputs with auto winner detection |
| Match History | Implemented | List + detail view with all match data |
| Home Dashboard | Implemented | Stats cards + recent matches list |
| Bottom Navigation | Implemented | Home, Matches, Players tabs |
| PWA Support | Implemented | Service worker + manifest for install |

## Database Schema

```
players ───────────┐
matches ────────────┼── match_teams ──┬─ match_participants ── players
                    │                 │
                    └─ match_scores ──┘
```

## Match Flow

1. Select match type (singles/doubles) via dropdown
2. Pick players from unified 2-column grid (auto Team A/B assignment)
3. Enter set scores (optional)
4. Select winner → Save to Supabase

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **State:** TanStack Query v5
- **Icons:** Lucide React
- **Charts:** Recharts (prepared)
- **PWA:** vite-plugin-pwa

## Environment Variables

```env
VITE_SUPABASE_URL=<your-project-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```