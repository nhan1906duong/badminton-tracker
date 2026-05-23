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

## Phase 1 — DB Migration & Types

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

### `src/types/database.ts`

- Add `export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED'`
- Add `status: MatchStatus` and `queue_position: number | null` to `Match` type

---

## Phase 2 — Remove Active Players

### `src/stores/session-store.ts`
- Remove `activePlayers` map and all related actions

### `src/pages/SessionMatchPlayersPage.tsx`
- Remove `useSessionStore` import and active player filter
- Show all players from `usePlayers()` unconditionally

### `src/pages/SessionDetailPage.tsx`
- Remove any active-player picker UI

---

## Phase 3 — Rework Create Match Flow

### Step 1 — Select Players (unchanged except no filter)
**Route:** `/sessions/:id/matches/new`

No behavior change beyond removing the active player filter.

### Step 2 — Confirm & Choose Status (replaces current result page)
**Route:** `/sessions/:id/matches/new/confirm`

- Shows team matchup card (players + match type tag)
- Two CTAs: **"Start Now"** | **"Add to Queue"**
- No score entry at this step
- On "Start Now":
  - If a live match already exists → block with inline error: *"Finish the current match first"*
  - Otherwise → insert match as `LIVE`
- On "Add to Queue":
  - Insert match as `SCHEDULED` with `queue_position = current max + 1`
- After save: navigate to session detail (`navigate(-2)`)

---

## Phase 4 — Session Detail Layout

Three ordered sections:

### Live (0 or 1 match)
- Match card: players, match type tag
- CTA: **"Record Result"** → navigates to `/sessions/:id/matches/:matchId/result`

### Queue (0–N matches, ordered by `queue_position`)
- Each card: queue position number, players, match type tag
- Per-card actions:
  - **"Start Match"** — only shown when no live match exists; sets `status = 'LIVE'`
  - **Delete** — removes the scheduled match
  - **Drag handle** — reorder within queue; updates `queue_position` for all affected rows
- Empty state: *"No matches queued"*

### Completed (existing behavior)
- Match history list, no change

---

## Phase 5 — Record Result Page

**Route:** `/sessions/:id/matches/:matchId/result`

New page — score + winner entry for an existing LIVE match.

- Loads match by `matchId` via `useMatch(matchId)`
- Same score entry UI as current `SessionMatchResultPage`
- On save: calls `useRecordResult` mutation
  - Sets `status = 'COMPLETED'`
  - Upserts scores (replaces existing)
  - Sets `is_winner` on teams
- On success: `navigate(-1)` back to session detail

---

## Phase 6 — Hook Changes (`src/hooks/useMatches.ts`)

### `useCreateMatch` (update)
Add `status: MatchStatus` and `queue_position?: number` to `CreateMatchInput`.
Pass both fields in the `matches` insert.

### `useStartMatch` (new)
```ts
mutationFn: async (matchId: string) =>
  supabase.from('matches').update({ status: 'LIVE' }).eq('id', matchId)
```
Invalidates `[MATCHES_KEY, sessionId]`.

### `useRecordResult` (new)
```ts
interface RecordResultInput {
  id: string
  winner_team: 'TEAM_A' | 'TEAM_B'
  scores: SetScore[]
}
mutationFn: async (input) => {
  // update match status to COMPLETED
  // update match_teams is_winner flags
  // delete + re-insert match_scores
}
```
Invalidates `[MATCHES_KEY]` and `[PLAYER_MATCHES_KEY]`.

### `useReorderQueue` (new)
```ts
mutationFn: async (updates: { id: string; queue_position: number }[]) =>
  // bulk upsert queue_position for each match id
```

### `useDeleteMatch` (existing)
No change needed.

---

## Routes (`src/components/AnimatedRoutes.tsx`)

| Route | Page | Notes |
|---|---|---|
| `/sessions/:id/matches/new` | `SessionMatchPlayersPage` | unchanged |
| `/sessions/:id/matches/new/confirm` | `SessionMatchConfirmPage` | new — replaces `/new/result` |
| `/sessions/:id/matches/:matchId/result` | `RecordMatchResultPage` | new |

Remove old route `/sessions/:id/matches/new/result`.

---

## Files Touched

| File | Change |
|---|---|
| DB | Migration SQL (status, queue_position, unique index) |
| `src/types/database.ts` | Add `MatchStatus`, update `Match` |
| `src/hooks/useMatches.ts` | Update `useCreateMatch`; add `useStartMatch`, `useRecordResult`, `useReorderQueue` |
| `src/stores/session-store.ts` | Remove active players |
| `src/pages/SessionMatchPlayersPage.tsx` | Remove active player filter |
| `src/pages/SessionMatchResultPage.tsx` | Repurpose or delete — replaced by confirm page |
| `src/pages/SessionMatchConfirmPage.tsx` | New — confirm + live/schedule choice |
| `src/pages/RecordMatchResultPage.tsx` | New — score + winner for existing match |
| `src/pages/SessionDetailPage.tsx` | Add Live / Queue / Completed sections, queue management |
| `src/components/AnimatedRoutes.tsx` | Update routes |

---

## Open Items

- Decide drag-to-reorder library (or use up/down arrows for simplicity)
- Determine if "Start Match" on a queue card should require confirmation when promoting
- Handle edge case: app reloads mid-live-match (status persists in DB, so it survives)
