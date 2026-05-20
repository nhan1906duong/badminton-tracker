# Brainstorm Report: Player Detail Page

Date: 2026-05-20

## Problem Statement

Add a Player Detail Page to the badminton match tracker app, and allow editing player name from the Players tab.

## Requirements

1. **Players Tab Navigation**: Tap a player to navigate to their detail page
2. **Player Detail Page** (`/players/:playerId`):
   - Editable name + avatar (existing fields)
   - Stats: total matches, wins, losses, donated = losses x 5000 VND
   - Best partner: doubles-only, highest win rate (wins / matches together), tie-breaker = most wins
   - Match history: all matches, infinite scroll (~10 per batch)

## Tech Stack Context

- React 19 + TypeScript + Vite
- React Router v7
- TanStack Query v5 (server state)
- Zustand (session state)
- Supabase (PostgreSQL)
- Tailwind CSS v4
- Lucide icons

## Decisions Made

| Question | Decision |
|---|---|
| Donation amount | 5000 VND per loss on player page (different from existing 10K) |
| Editable fields | Name + avatar only (no description field) |
| Navigation | Tap player -> Player Page |
| Best partner scope | Doubles only (real partners) |
| Lazy loading style | Infinite scroll (load more on scroll) |

## Recommended Approach: Client-Side Computation

Fetch all player matches with teams/participants, compute best partner in JS.
No DB changes needed.

## New Files

- `src/pages/PlayerDetailPage.tsx` - Player detail page
- `src/hooks/usePlayer.ts` - Single player query
- `src/hooks/usePlayerMatches.ts` - Paginated match history
- `src/hooks/useBestPartner.ts` - Best partner computation

## Modified Files

- `src/components/AnimatedRoutes.tsx` - Add `/players/:playerId` route
- `src/pages/PlayersPage.tsx` - Make player items tappable

## Risks

- Best partner query may be slow for high-volume players (mitigation: optimize if needed)
- Infinite scroll requires intersection observer on mobile
