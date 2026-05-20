# Project Roadmap

## Phase Status

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 1 | Project Setup | ✅ Done | Vite, React, Tailwind, Supabase |
| 2 | Authentication | ✅ Done | OTP email login |
| 3 | Player Management | ✅ Done | CRUD + active toggle |
| 4 | Session-Based Match Recording | ✅ Done | Sessions, active-player filter, match create/edit |
| 5 | Home Dashboard | ✅ Done | Stats + recent matches + PodiumChart |
| 6 | Player Rankings | ✅ Done | Win rate, leaderboard, top donate |
| 7 | Match History | ✅ Done | List + detail view |
| 8 | Avatar Upload | ✅ Done | Camera/gallery picker, Supabase Storage |
| 9 | Player Detail Page | ✅ Done | Avatar/name edit, stats, best partner, match history |
| 10 | PWA Enhancement | ⏳ Pending | Offline support, push notifications |
| 11 | Testing | ⏳ Pending | Unit tests, E2E tests |

## Phase Details

### Phase 1: Project Setup ✅
- [x] Vite + React + TypeScript
- [x] Tailwind CSS v4
- [x] Supabase integration
- [x] Router setup
- [x] Bottom navigation

### Phase 2: Authentication ✅
- [x] Supabase OTP email login
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
- [x] Match type selector (dropdown)
- [x] Player selection (filtered by active list)
- [x] Auto team assignment (Team A/B by selection order)
- [x] Score entry per set
- [x] Manual winner selection
- [x] Save match to database (with session_id)
- [x] Edit match (scores, winner, match type)
- [x] Delete match from session

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
- [x] User avatar on Settings page
- [x] Player avatar on Players page
- [x] Avatar in PlayerSelector grid
- [x] Avatar in PodiumChart
- [x] profiles table for user avatars

### Phase 9: Player Detail Page ✅
- [x] Player detail page at `/players/:playerId`
- [x] Editable avatar (tap to open AvatarPicker)
- [x] Editable name (inline edit, blur/Enter to save)
- [x] Stats row: total matches, wins, losses, donated amount
- [x] Best partner card (doubles-only, highest win rate)
- [x] Match history list with infinite scroll (~10 per batch)
- [x] Navigation tests updated for new route
- [x] Build passes, 19/19 tests pass

### Phase 10: PWA Enhancement ⏳
- [ ] Offline mode
- [ ] Background sync
- [ ] Push notifications
- [ ] App icons

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
| Release (Phase 10-11) | Q3 2026 | Pending |
