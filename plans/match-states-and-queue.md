# Match States & Queue — Implementation Plan

## Overview

Rework the match creation flow to support live and scheduled matches within a session.
Remove the "active players" concept — all players are always available for selection.

## Goals

- Every player is selectable for any match (no session-level active player filter)
- A match can be **Live** (in progress) or **Scheduled** (queued)
- At most 1 live match per session at a time
- Queue is orderable and deletable
- Two-step play flow: **Start Match** → **Record Result**
- Match type + players are locked once scheduled (no editing before live)

---

## Match Lifecycle

```
Create → SCHEDULED  →  [Start Match]  →  LIVE  →  [Record Result]  →  COMPLETED
       ↘ LIVE (Start Now) ──────────────────────────────────────────↗
```

---

## Phase 1 — DB Migration & Types ✅ DONE

### SQL

```sql
ALTER TABLE matches
  ADD COLUMN status TEXT NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN queue_position INTEGER;

-- Enforce at most 1 live match per session
CREATE UNIQUE INDEX one_live_per_session
  ON matches(session_id) WHERE status = 'LIVE';
```

Existing rows default to `COMPLETED` — no data migration needed.

### `src/types/database.ts` ✅

- Added `export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED'`
- Added `status: MatchStatus` and `queue_position: number | null` to `Match` type

---

## Phase 2 — Remove Active Players ✅ DONE

### `src/stores/session-store.ts` ✅
- Cleared to an empty module (`export {}`) — all `activePlayers` state and actions removed.

### `src/pages/SessionMatchPlayersPage.tsx` ✅
- Deleted.

### `src/pages/SessionDetailPage.tsx` ✅
- Active-player picker UI removed.

---

## Phase 3 — Rework Create Match Flow ✅ DONE

> **Implementation note:** Rather than a 2-page flow (Players → Confirm), this was collapsed
> into a single `CreateMatchPage` with inline mode selection. The "When" section uses a
> 3-way segmented control: **Now** | **Schedule** | **Queue**.

### `src/pages/CreateMatchPage.tsx` (new, replaces both old pages) ✅

**Route:** `/sessions/:id/matches/new`

Sections on the page:
1. **Match type** — `MatchTypeChips` selector
2. **Players** — slot-based picker (Team A / VS / Team B), bottom-sheet player search per slot
3. **When** — segmented control:
   - **Now** — inserts match as `LIVE`. If a live match already exists, shows inline error.
   - **Schedule** — inserts as `SCHEDULED` with a custom date/time; quick-pick chips (15 min / 30 min / 1 hr).
   - **Queue** — inserts as `SCHEDULED` with `queue_position = current max + 1`; shows queue chain preview if a live match exists.

CTA label updates based on mode and player fill state.

On save: `navigate(-1)` back to session detail.

### Deleted files ✅
- `src/pages/SessionMatchPlayersPage.tsx` — removed
- `src/pages/SessionMatchResultPage.tsx` — removed

---

## Phase 4 — Session Detail Layout ❌ PENDING

Rework `SessionDetailPage.tsx` to partition matches by `status` into three sections.

### Data partitioning (derived from `useMatches` result)

```ts
const liveMatch = matches?.find(m => m.status === 'LIVE') ?? null
const queuedMatches = (matches ?? [])
  .filter(m => m.status === 'SCHEDULED')
  .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0))
const completedMatches = (matches ?? [])
  .filter(m => m.status === 'COMPLETED')
  .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
```

### Section 1 — Live (0 or 1 match)

Shown only when `liveMatch !== null`. Uses new `LiveMatchCard` component.

**`src/components/LiveMatchCard.tsx`** (new):
- Displays players for both teams (same layout as MatchCard), match type tag, pulsing "LIVE" badge
- CTA button: **"Record Result"** → `navigate(\`/sessions/${sid}/matches/${liveMatch.id}/result\`)`
- No swipe/delete (live match can't be deleted while active)

### Section 2 — Queue (0–N matches)

Shown only when `queuedMatches.length > 0`. Uses new `QueueMatchCard` component.

**`src/components/QueueMatchCard.tsx`** (new):
- Left: queue position badge (`#1`, `#2`, …)
- Center: players (both teams) + match type tag
- Right: up/down arrow buttons (calls `useReorderQueue`) + delete icon (calls `useDeleteMatch` with confirm)
- **"Start Match"** button — full-width below the row, only rendered when `liveMatch === null`; calls `useStartMatch(match.id)`

Reorder logic: clicking ↑ swaps `queue_position` with the item above; ↓ swaps with item below. Pass the whole `queuedMatches` array + index to derive the new order.

### Section 3 — Completed (existing behavior)

Keep existing `MatchesContent` + `MatchCard` with swipe-to-delete. Section title "Matches", subtitle `N played`. Only rendered when `completedMatches.length > 0`.

### Header subtitle update

Replace the static `"N played"` count with `"N played · Q queued · 1 live"` (omit zeroes).

---

## Phase 5 — Record Result Page ❌ PENDING

**Route:** `/sessions/:id/matches/:matchId/result`

**`src/pages/RecordMatchResultPage.tsx`** (new file):

```
AppBar
  ← back                     "Record Result"
──────────────────────────────────────────────
[read-only mini match card — players + type]
──────────────────────────────────────────────
ScoreEntry (scores, onChange, winner, onWinnerChange)
──────────────────────────────────────────────
[error banner if validation fails]
──────────────────────────────────────────────
[bottom sticky CTA]
  "Save Result"  (disabled until winner selected)
```

Implementation notes:
- `const { matchId } = useParams()` — load via `useMatch(matchId)`
- Derive `teamA` / `teamB` participants from `match.teams` + `match.participants`
- Reuse `ScoreEntry` component unchanged
- On save: call `useRecordResult({ id: matchId, winner_team, scores })`
- On success: `navigate(-1)` (returns to session detail)
- Loading state: spinner; match-not-found state: error message

Add route to `AnimatedRoutes.tsx`:
```tsx
{ path: '/sessions/:id/matches/:matchId/result', element: <RecordMatchResultPage />, auth: true }
```

No change to `App.tsx` — `/result` is not a tab route so bottom nav is already hidden.

---

## Phase 6 — Hook Changes (`src/hooks/useMatches.ts`) ✅ DONE

### `useCreateMatch` ✅
Updated `CreateMatchInput` with `status: MatchStatus` and `queue_position?: number`.

### `useStartMatch` ✅
```ts
mutationFn: async (matchId: string) =>
  supabase.from('matches').update({ status: 'LIVE', queue_position: null }).eq('id', matchId)
```
Invalidates `[MATCHES_KEY]`.

### `useRecordResult` ✅
```ts
interface RecordResultInput {
  id: string
  winner_team: 'TEAM_A' | 'TEAM_B'
  scores: SetScore[]
}
```
Sets `status = 'COMPLETED'`, updates `played_at`, updates team winner flags, replaces scores.
Invalidates `[MATCHES_KEY]` and `[PLAYER_MATCHES_KEY]`.

### `useReorderQueue` ✅
```ts
mutationFn: async (updates: { id: string; queue_position: number }[]) =>
  // parallel update queue_position for each match id
```

### `useDeleteMatch` ✅
No change — existing implementation handles all child rows.

---

## Routes (`src/components/AnimatedRoutes.tsx`)

| Route | Page | Status |
|---|---|---|
| `/sessions/:id/matches/new` | `CreateMatchPage` | ✅ Live |
| `/sessions/:id/matches/:matchId/result` | `RecordMatchResultPage` | ❌ Pending (Phase 5) |
| `/sessions/:id/matches/:matchId/edit` | `EditMatchPage` | ✅ Existing |

Old routes removed: `/sessions/:id/matches/new/result`, `/sessions/:id/matches/new/confirm`.

---

## Files Touched

| File | Change | Status |
|---|---|---|
| DB | Migration SQL (status, queue_position, unique index) | ✅ Done |
| `src/types/database.ts` | Add `MatchStatus`, update `Match` | ✅ Done |
| `src/hooks/useMatches.ts` | Update `useCreateMatch`; add `useStartMatch`, `useRecordResult`, `useReorderQueue` | ✅ Done |
| `src/stores/session-store.ts` | Remove active players (now empty module) | ✅ Done |
| `src/stores/new-match-store.ts` | Add `mode: CreateMatchMode` (`now`/`schedule`/`queue`), `scheduledAt` | ✅ Done |
| `src/pages/SessionMatchPlayersPage.tsx` | Deleted | ✅ Done |
| `src/pages/SessionMatchResultPage.tsx` | Deleted | ✅ Done |
| `src/pages/CreateMatchPage.tsx` | New — single-page match creation with mode selector | ✅ Done |
| `src/pages/RecordMatchResultPage.tsx` | New — score + winner for existing LIVE match | ❌ Pending (Phase 5) |
| `src/pages/SessionDetailPage.tsx` | Partition matches into Live / Queue / Completed sections | ❌ Pending (Phase 4) |
| `src/components/LiveMatchCard.tsx` | New — live match card with "Record Result" CTA | ❌ Pending (Phase 4) |
| `src/components/QueueMatchCard.tsx` | New — queued match card with Start / Delete / Reorder | ❌ Pending (Phase 4) |
| `src/components/AnimatedRoutes.tsx` | Add `/result` route | ❌ Pending (Phase 5) |

---

## Open Items

- Decide drag-to-reorder vs. up/down arrows for queue reordering (leaning arrows for simplicity)
- Handle edge case: app reloads mid-live-match (status persists in DB, so it survives)
- `session-store.ts` is an empty module — safe to delete once all imports are cleaned up
