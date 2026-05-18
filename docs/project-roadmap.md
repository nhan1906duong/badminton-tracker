# Project Roadmap

## Phase Status

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 1 | Project Setup | ✅ Done | Vite, React, Tailwind, Supabase |
| 2 | Authentication | ✅ Done | OTP email login |
| 3 | Player Management | ✅ Done | CRUD + active toggle |
| 4 | Session-Based Match Recording | ✅ Done | Sessions, active-player filter, match create/edit |
| 5 | Home Dashboard | ✅ Done | Stats + recent matches |
| 6 | Player Rankings | ⏳ Pending | Win rate, leaderboard |
| 7 | Match History | ✅ Done | List + detail view |
| 8 | PWA Enhancement | ⏳ Pending | Offline support, push notifications |
| 9 | Testing | ⏳ Pending | Unit tests, E2E tests |

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

### Phase 6: Player Rankings ⏳
- [ ] Win/loss statistics
- [ ] Leaderboard UI
- [ ] Sort by wins, win rate
- [ ] Filter by date range

### Phase 7: Match History ✅
- [x] Match list page (/matches)
- [x] Match detail view (/matches/:id)
- [x] MatchCard component

### Phase 8: PWA Enhancement ⏳
- [ ] Offline mode
- [ ] Background sync
- [ ] Push notifications
- [ ] App icons

### Phase 9: Testing ⏳
- [ ] Unit tests (Vitest)
- [ ] Component tests
- [ ] E2E tests (Playwright)
- [ ] CI/CD pipeline

## Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| MVP (Phases 1-4) | ✅ Done | Working app |
| Core Features (Phases 5-7) | ✅ Done | Dashboard + match history |
| Release (Phase 8-9) | Q3 2026 | Pending |