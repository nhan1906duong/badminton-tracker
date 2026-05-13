# Badminton Match Tracker — Implementation Plan

A PWA for tracking badminton matches with multi-user support. Add to iOS home screen, select players, record results, view rankings.

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | React 19 + TypeScript + Vite | Mature, great DX, fast builds |
| PWA | `vite-plugin-pwa` + Workbox | Zero-config PWA on Vite |
| Styling | Tailwind CSS v4 | Utility-first, fast prototyping |
| UI Components | shadcn/ui | Accessible, customizable components |
| Backend/DB | Supabase | Free PostgreSQL, Auth, Realtime, easy Vercel deploy |
| Data Fetching | TanStack Query v5 | Caching, sync, optimistic updates |
| Client State | Zustand | Lightweight, simple |
| Charts | Recharts | React-native charts for reports |
| Icons | Lucide React | Clean, consistent |
| Hosting | Vercel | User-specified, zero-config deploy |

---

## Phase Overview

| Phase | Status | Description |
|-------|--------|-------------|
| [Phase 1](phase-01-project-setup.md) | Pending | Vite + React + Tailwind + PWA + Supabase setup |
| [Phase 2](phase-02-supabase-schema.md) | Pending | Database schema, RLS policies, seed data |
| [Phase 3](phase-03-auth-users.md) | Pending | User auth (magic link / OTP), player profiles |
| [Phase 4](phase-04-match-recording.md) | Pending | Player selection, match creation, score entry |
| [Phase 5](phase-05-match-history.md) | Pending | Match list, edit/delete, match detail view |
| [Phase 6](phase-06-ranking-leaderboard.md) | Pending | Win rate stats, ranking page, leaderboard |
| [Phase 7](phase-07-reports-charts.md) | Pending | Charts, trends, partner stats, head-to-head |
| [Phase 8](phase-08-pwa-polish.md) | Pending | iOS icons, splash screens, offline support, install prompt |
| [Phase 9](phase-09-deploy.md) | Pending | Vercel deploy, custom domain, env config |

---

## Data Model (Summary)

```
players          → id, name, email, avatar_url, created_at, created_by
matches          → id, match_type, played_at, notes, created_by, created_at
match_teams      → id, match_id, team_label, is_winner
match_participants → id, match_id, team_id, player_id
match_scores     → id, match_id, set_number, team_a_score, team_b_score
```

See [Phase 2](phase-02-supabase-schema.md) for full schema with RLS.

---

## Key Decisions

1. **Auth**: Supabase magic link (no passwords). Simple for casual users.
2. **Match type**: `MEN_DOUBLES` default. Extensible to `WOMEN_DOUBLES`, `MIXED_DOUBLES`, `MEN_SINGLES`, `WOMEN_SINGLES`.
3. **Scores**: Optional. Store per-set scores. Allow best-of-3 or best-of-5.
4. **Multi-user**: All data shared across authenticated users. RLS ensures users only see their group's data via `created_by` cascade or a future `club_id`.
5. **Offline**: Basic offline support via service worker caching. Full offline sync is out of scope for v1.

---

## Decisions (v1)

1. **Data scope**: All authenticated users share ALL match data (simple, small-group friendly).
2. **Players**: Anyone signed in can add named players. Players are records — registration NOT required.
3. **Scheduling**: Completed matches only. No future-match scheduling in v1.
4. **Execution**: Phase by phase, with user approval gate between phases.

---

## Unresolved Questions

_None at v1 start. Open items will be tracked per-phase._
