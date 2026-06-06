# Project Roadmap

## Phase Status

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 1 | Project Setup | ✅ Done | Vite, React, Tailwind, Supabase |
| 2 | Authentication | ✅ Done | Email + password login |
| 3 | Player Management | ✅ Done | CRUD + active toggle |
| 4 | Session-Based Match Recording | ✅ Done | Sessions, match create/edit, authenticated start/end |
| 5 | Home Dashboard | ✅ Done | Stats + recent matches + PodiumChart |
| 6 | Player Rankings | ✅ Done | Win rate, leaderboard, top donate, current weekly Top 1 streak |
| 7 | Match History | ✅ Done | List + detail view |
| 8 | Avatar Upload | ✅ Done | Camera/gallery picker, Supabase Storage |
| 9 | Player Detail Page | ✅ Done | Avatar/name edit, stats, all partners (win-rate sorted, expandable), match history, achievements |
| 9a | BWF Category Badges | ✅ Done | Tiered color badges (S1000/S750/S500/S300/S100/Finals) on sessions |
| 9b | Champion Celebration | ✅ Done | One-time firework effect for linked champion on ended session stats |
| 9c | Ranking Sync & No-Winner Handling | ✅ Done | Session MVP/top-player panels use shared leaderboard data; no-winner matches are excluded from aggregates |
| 9d | Match Points Breakdown | ✅ Done | Match-level point breakdown page sourced from `player_match_results` |
| 9e | Locale, Backup, and Player RLS | ✅ Done | English/Vietnamese switch, admin JSON backup, and linked-player/admin update policy |
| 10 | PWA Enhancement | ✅ Done | Service worker, manifest, offline cache |
| 11 | Session Types Expansion | ✅ Done | Regular / Tournament / League with round-robin, team standings, schedule grid |
| 12 | Session Attendance RSVP | ✅ Done | Linked players/admins confirm or decline regular/tournament attendance; declined players are filtered from match creation |
| 13 | Testing | 🚧 In Progress | Unit and component tests exist; E2E/CI remain open |
| 14 | Persistent Point Log | ⏳ Pending | Store point-by-point scoring events in the database and restore/display them on match detail |

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
- [x] Session detail page (session summary + match list)
- [x] Match creation scoped to session
- [x] Match type selector (segmented chips)
- [x] Player selection (filtered by active list)
- [x] Auto team assignment (Team A/B by selection order)
- [x] Fair shuffle for doubles — cycle-based split rotation (C(N,4)×3 splits, all used before repeating) with 4-tier ranking: head-to-head balance → team strength → rest fairness → random (`src/lib/fair-shuffle.ts`)
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
- [x] Current calendar-week Top 1 streak on all-time ranking rows

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
- [x] Build passes

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
- [x] Exclude no-winner completed matches from session stats, player match history, head-to-head stats, and partner stats
- [x] Add stronger confirmation dialogs for ending sessions with live matches and deleting recorded data
- [x] Add ARIA dialog semantics to the shared `Dialog` component

### Phase 9d: Match Points Breakdown ✅
- [x] Add `/sessions/:id/matches/:matchId/points` route
- [x] Show team rating context, score margin, strength bonus, and per-player weekly points
- [x] Expose `useMatchPlayerResults(matchId)` for match-level point rows
- [x] Add `usePlayerPointsHistory(playerId)` as a reusable grouping hook for future player-level point history UI

### Phase 9e: Locale, Backup, and Player RLS ✅
- [x] Add English/Vietnamese translation dictionary and `LocaleProvider`
- [x] Add Settings language switch
- [x] Add admin-only JSON backup mutation
- [x] Restrict player updates to admins or the linked profile via `013_player_update_rls.sql`

### Phase 10: PWA Enhancement ✅
- [x] Service worker + manifest
- [x] App icons and splash screens
- [x] Offline cache for static assets

### Phase 11: Session Types Expansion ✅
- [x] Add explicit `regular` / `tournament` / `league` session types
- [x] Add league teams, fixed match type, total rounds, round-robin scheduling, standings, and schedule grid
- [x] Add league match creation flow that pre-fills players from selected teams

### Phase 12: Session Attendance RSVP ✅
- [x] Add `session_attendances` table and linked-player/admin RLS policies
- [x] Add `useSessionAttendances`, `useUpsertAttendance`, and `useDeleteAttendance`
- [x] Add `SessionAttendancePanel` with confirmed, declined, and no-response states
- [x] Show attendance inline for scheduled regular/tournament sessions and in the live session menu
- [x] Filter declined players out of regular/tournament match creation and shuffle pools

### Phase 13: Testing 🚧
- [x] Unit tests (Vitest)
- [x] Component tests
- [ ] E2E tests (Playwright)
- [ ] CI/CD pipeline

### Phase 14: Persistent Point Log ⏳
- [ ] Add a database table for point-by-point match events
- [ ] Persist point increments, decrements, direct score edits, and undo actions for live matches
- [ ] Restore point history when reopening or viewing a match
- [ ] Re-enable the Match Detail point log UI after point events are stored durably

## Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| MVP (Phases 1-4) | ✅ Done | Working app |
| Core Features (Phases 5-7) | ✅ Done | Dashboard + match history |
| Avatar & Rankings (Phase 8) | ✅ Done | Avatar upload + leaderboard |
| Player Detail Page (Phase 9) | ✅ Done | Avatar/name edit + stats + all partners |
| Release (Phase 10-11) | Q3 2026 | In progress |
