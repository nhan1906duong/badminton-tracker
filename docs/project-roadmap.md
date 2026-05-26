# Project Roadmap

## Phase Status

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 1 | Project Setup | ✅ Done | Vite, React, Tailwind, Supabase |
| 2 | Authentication | ✅ Done | Email + password login |
| 3 | Player Management | ✅ Done | CRUD + active toggle |
| 4 | Session-Based Match Recording | ✅ Done | Sessions, active-player filter, match create/edit, authenticated start/end |
| 5 | Home Dashboard | ✅ Done | Stats + recent matches + PodiumChart |
| 6 | Player Rankings | ✅ Done | Win rate, leaderboard, top donate |
| 7 | Match History | ✅ Done | List + detail view |
| 8 | Avatar Upload | ✅ Done | Camera/gallery picker, Supabase Storage |
| 9 | Player Detail Page | ✅ Done | Avatar/name edit, stats, best partner, match history, achievements |
| 9a | BWF Category Badges | ✅ Done | Tiered color badges (S1000/S750/S500/S300/S100/Finals) on sessions |
| 9b | Champion Celebration | ✅ Done | One-time firework effect for linked champion on ended session stats |
| 9c | Ranking Sync & No-Winner Handling | ✅ Done | Session MVP/top-player panels use shared leaderboard data; no-winner matches are excluded from aggregates |
| 10 | PWA Enhancement | ✅ Done | Service worker, manifest, offline cache |
| 11 | Testing | ⏳ Pending | Unit tests, E2E tests |

## Phase Details

### Phase 1: Project Setup ✅
- [x] Vite + React + TypeScript
- [x] Tailwind CSS v4
- [x] Supabase integration
- [x] Router setup
- [x] Bottom navigation

### Phase 2: Authentication ✅
- [x] Supabase email + password login
- [x] Auth context
- [x] Protected routes
- [x] Loading states

### Phase 3: Player Management ✅
- [x] Player list page
- [x] Add player modal
- [x] Toggle active status
- [x] Player selector component

### Phase 4: Session-Based Match Recording ✅
- [x] Sessions table + migration
- [x] Create session (auto-closes previous)
- [x] Session detail page (active players + match list)
- [x] Active-player filter (local-only, per session)
- [x] Create-session active player picker w/ top-5 default (chip + virtualized bottom sheet)
- [x] Match creation scoped to session
- [x] Match type selector (segmented chips)
- [x] Player selection (filtered by active list)
- [x] Auto team assignment (Team A/B by selection order)
- [x] Fair shuffle for doubles — priority-based player rotation + lowest-score team split seeded from session history (`src/lib/fair-shuffle.ts`)
- [x] Score entry per set
- [x] Manual winner selection
- [x] Save match to database (with session_id)
- [x] Edit match (scores, winner, match type)
- [x] Delete match from session
- [x] Any authenticated user can start/end sessions and edit match lifecycle/details

### Phase 5: Home Dashboard ✅
- [x] Stats cards (total matches, players)
- [x] Recent matches list

### Phase 6: Player Rankings ✅
- [x] Win/loss statistics
- [x] Leaderboard UI (PodiumChart top 5)
- [x] Sort by wins, losses (donations)
- [x] Avatar display on leaderboard

### Phase 7: Match History ✅
- [x] Match list page (/matches)
- [x] Match detail view (/matches/:id)
- [x] MatchCard component

### Phase 8: Avatar Upload ✅
- [x] Avatar component with fallback chain (src → initial letter)
- [x] AvatarPicker bottom sheet (camera / gallery / remove)
- [x] 2x5 grid of 10 default multiavatar options
- [x] useSetDefaultAvatar hook for storing external multiavatar URLs
- [x] cleanupOldAvatar helper that removes old uploaded photos from Supabase Storage
- [x] Client-side image compression (200x200 JPEG)
- [x] Supabase Storage upload/delete hooks
- [x] User avatar display on Settings page
- [x] Player avatar on Players page
- [x] Avatar in PlayerSelector grid
- [x] Avatar in PodiumChart
- [x] profiles table for user avatars

### Phase 9: Player Detail Page ✅
- [x] Player detail page at `/players/:playerId`
- [x] Editable avatar (tap to open AvatarPicker)
- [x] Editable name (inline edit, blur/Enter to save)
- [x] Player avatar/name editing available directly from Player Detail page
- [x] Stats row: total matches, wins, losses, donated amount
- [x] Best partner card (doubles-only, highest win rate)
- [x] Match history list with infinite scroll (~10 per batch)
- [x] Achievements tab: sessions where player ranked #1 (champion) or #2 (runner-up)
- [x] Scrollable tab bar (SegmentedControl) for 4 tabs on mobile
- [x] Navigation tests updated for new route
- [x] Build passes, 154/154 tests pass

### Phase 9a: BWF Category Badges ✅
- [x] BwfCategoryBadge component with tiered colors per category
- [x] Join bwf_tournaments in useSessions / useSession / useOpenSession
- [x] Display badge on session cards (SessionsListPage)
- [x] Display badge on session detail (SessionDetailPage)

### Phase 9b: Champion Celebration ✅
- [x] Canvas firework overlay component
- [x] Show celebration on ended session stats when the linked player is rank #1
- [x] Persist one-time playback per session/player in localStorage
- [x] Show champion badge on the rank #1 stats row

### Phase 9c: Ranking Sync & No-Winner Handling ✅
- [x] Extract shared session leaderboard builder in `useRankings.ts`
- [x] Add `useSessionLeaderboard(sessionId)` and `useSessionLeaderboards()` for session detail/list summaries
- [x] Sync session card top player, session detail MVP, and session stats ranking to `player_match_results`
- [x] Add `useEndMatchNoWinner()` to complete a match while clearing winner/ranking rows
- [x] Exclude no-winner completed matches from session stats, player match history, head-to-head stats, and best-partner stats
- [x] Add stronger confirmation dialogs for ending sessions with live matches and deleting recorded data
- [x] Add ARIA dialog semantics to the shared `Dialog` component

### Phase 10: PWA Enhancement ✅
- [x] Service worker + manifest
- [x] App icons and splash screens
- [x] Offline cache for static assets

### Phase 11: Testing ⏳
- [ ] Unit tests (Vitest)
- [ ] Component tests
- [ ] E2E tests (Playwright)
- [ ] CI/CD pipeline

## Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| MVP (Phases 1-4) | ✅ Done | Working app |
| Core Features (Phases 5-7) | ✅ Done | Dashboard + match history |
| Avatar & Rankings (Phase 8) | ✅ Done | Avatar upload + leaderboard |
| Player Detail Page (Phase 9) | ✅ Done | Avatar/name edit + stats + best partner |
| Release (Phase 10-11) | Q3 2026 | Ready |
