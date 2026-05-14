# Project Roadmap

## Phase Status

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 1 | Project Setup | ✅ Done | Vite, React, Tailwind, Supabase |
| 2 | Authentication | ✅ Done | OTP email login |
| 3 | Player Management | ✅ Done | CRUD + active toggle |
| 4 | Match Recording | ✅ Done | 3-step wizard, scores, teams |
| 5 | Home Dashboard | 🔄 In Progress | Stats + recent matches |
| 6 | Player Rankings | ⏳ Pending | Win rate, leaderboard |
| 7 | Match History | ⏳ Pending | Filter, search, detail view |
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

### Phase 4: Match Recording ✅
- [x] Match type selector
- [x] Player selection (quick pick + all)
- [x] Team assignment
- [x] Score entry per set
- [x] Auto winner detection
- [x] Save match to database

### Phase 5: Home Dashboard 🔄
- [x] Stats cards (total matches, players)
- [x] Recent matches list
- [ ] Top players section
- [ ] Quick actions

### Phase 6: Player Rankings ⏳
- [ ] Win/loss statistics
- [ ] Leaderboard UI
- [ ] Sort by wins, win rate
- [ ] Filter by date range

### Phase 7: Match History ⏳
- [ ] Match list with pagination
- [ ] Search by player
- [ ] Match detail view
- [ ] Edit/delete matches

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
| Beta (Phases 5-7) | Q2 2026 | In progress |
| Release (Phase 8-9) | Q3 2026 | Pending |