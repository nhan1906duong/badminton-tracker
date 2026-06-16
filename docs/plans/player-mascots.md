# Plan: Player Mascots (Rive)

## Goal

Each player can pick a personal "mascot" — a small animated character (built with
[Rive](https://rive.app)) that appears on their profile and reacts during their
matches (idle/cheering while live, celebrating on a win, consoling on a loss).
The goal is encouragement/personality, not gameplay — purely cosmetic.

## Why Rive

- Single `.riv` file per mascot containing multiple animations/state-machine
  states (idle, win, lose, cheer) — much smaller than Lottie JSON for the same
  complexity, and runs on a `<canvas>` via WebGL/WASM.
- `@rive-app/react-canvas` gives a `<RiveComponent>` + `useStateMachineInput`
  hook for driving state transitions from app state (e.g. match result).
- Mascots are a **curated asset set** shipped with the app (like the 10 default
  multiavatars), not user-uploaded — keeps this simple and avoids a Rive editor
  workflow for end users.

## Data Model

Add one nullable column to `players`:

```sql
-- supabase/migrations/019_player_mascot.sql
alter table players add column mascot_id text;
```

- `mascot_id` is a key into a static `MASCOTS` registry in app code (e.g.
  `'fox'`, `'panda'`, `'tiger'`), not a file path — keeps asset paths out of
  the DB and lets us rename/move files freely.
- `null` = no mascot selected (default state, no UI shown).
- Update `src/types/database.ts` `Player` interface: `mascot_id?: string | null`.

## Assets

- New directory: `public/mascots/<id>.riv` (one file per mascot).
- Each `.riv` file authored with a state machine named `State Machine 1`
  (Rive default) exposing:
  - A `Trigger` input `win` → plays celebration animation, returns to idle.
  - A `Trigger` input `lose` → plays consoling animation, returns to idle.
  - Default/idle animation plays on loop with no input.
- Start with 6-8 mascots (animals fit the playful badminton vibe: fox, panda,
  tiger, owl, shuttle-bird, etc.). Source from Rive's community files or
  commission/build minimal ones — out of scope for this plan to produce the
  assets themselves, but the integration must work with any `.riv` matching
  this contract.
- Static thumbnail (`public/mascots/thumbs/<id>.png`) per mascot for the
  picker grid, to avoid spinning up N Rive canvases at once.

## New Files

| File | Role |
|---|---|
| `src/lib/mascots.ts` | `MASCOTS` registry: `{ id, name, rivePath, thumbnailPath }[]` + helper `getMascot(id)` |
| `src/components/MascotPicker.tsx` | Bottom-sheet grid picker (mirrors `AvatarPicker.tsx`) — thumbnails only, no live Rive |
| `src/components/PlayerMascot.tsx` | Wraps `<RiveComponent>`, props: `mascotId`, `size`, `trigger?: 'win' \| 'lose'`. Lazy-loads `@rive-app/react-canvas` (code-split) |
| `supabase/migrations/019_player_mascot.sql` | Adds `mascot_id` column |

## Hook Changes

- `src/hooks/usePlayers.ts` — `useUpdatePlayer` already accepts `Partial<Player>`,
  so no change needed; mascot selection just calls it with `{ id, mascot_id }`.

## UI Integration

### 1. Mascot selection (PlayerDetailPage)

- Add a "Mascot" row near the avatar editing area on `PlayerDetailPage`
  (own profile only — same gating as avatar edit, via `useProfile().player_id === id`).
- Tapping opens `MascotPicker` (bottom sheet, same pattern as `AvatarPicker`).
- Selecting calls `useUpdatePlayer({ id, mascot_id })`.
- If `mascot_id` is set, render `<PlayerMascot mascotId={...} size={64} />`
  (idle loop) next to/below the avatar.

### 2. Live match reactions (MatchDetailPage)

- For each participant with a `mascot_id`, render a small `<PlayerMascot>`
  (idle loop, ~40px) next to their name while `status === 'LIVE'` — purely
  decorative "cheering on the sidelines".
- On `recordResult` success (match → COMPLETED with winner), trigger:
  - `win` on mascots of players on the winning team
  - `lose` on mascots of players on the losing team
  - Use `useStateMachineInput` + a `useEffect` keyed on `completedWinnerLabel`
    to fire the trigger once.

### 3. Avatar fallback

- Mascots are additive — `Avatar` component and avatar picker are unchanged.
  Mascot renders alongside, never replaces, the avatar.

## Performance / Bundle Considerations

- `@rive-app/react-canvas` (~150-200KB incl. wasm) must be **lazy-loaded**
  (`React.lazy` + `Suspense`) so it's not in the main bundle for users who
  never view a player with a mascot.
- Each `<PlayerMascot>` instance loads its own small `.riv` (~10-30KB) —
  acceptable for a handful of visible mascots on `MatchDetailPage`.
- `MascotPicker` uses static PNG thumbnails (no Rive instances) to keep the
  picker lightweight even with 8 mascots on screen.

## Phased Implementation

1. **Data + registry**: migration `019_player_mascot.sql`, update
   `database.ts`, add `src/lib/mascots.ts` with 1-2 placeholder mascots to
   validate the pipeline end-to-end.
2. **Picker + selection**: `MascotPicker.tsx`, wire into `PlayerDetailPage`
   (own-profile gated), persist via `useUpdatePlayer`.
3. **Idle display**: `PlayerMascot.tsx` (lazy-loaded Rive wrapper), show idle
   mascot on `PlayerDetailPage` and on `MatchDetailPage` participant rows
   for LIVE matches.
4. **Win/lose reactions**: wire `recordResult` completion to fire `win`/`lose`
   triggers on `MatchDetailPage`.
5. **Asset expansion**: add remaining mascots (5-6 more) + thumbnails once
   pipeline is proven.
6. **Tests**: `src/lib/mascots.test.ts` (registry lookup), component test for
   `MascotPicker` selection callback; mock `@rive-app/react-canvas` in tests
   (it requires WebGL/canvas, won't run in jsdom without a stub).

## Open Questions for User

- Where do the `.riv` mascot assets come from (commission, Rive community
  marketplace, or hand-authored in Rive editor)? This plan assumes they're
  supplied separately.
- Should mascots also appear on `RankingPage` leaderboard rows, or stay
  scoped to `PlayerDetailPage` + `MatchDetailPage` for v1?
