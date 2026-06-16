# Feature Recommendations — Badminton Tracker

## Context

The app is already feature-rich: sessions, matches, live scoring, Elo ratings, multiple ranking views, leagues, H2H, badges. The biggest opportunity is **surfacing data that's already captured but never shown** — the underlying schema and hooks are ahead of the UI. Below are 5 ranked recommendations, easiest/highest-impact first.

---

## Recommendation 1 — "Most Improved" on Player Tab ✅ Done

**Implemented:** `lastSessionRatingDelta` is now surfaced inline on the Player tab. Each row's right column shows:
- Elo rating (top)
- Rank-change arrow + last-session Elo delta side by side (bottom): `↑2  +18` in green, `↓1  −12` in red
- Rank trend hidden when rank is unchanged; elo delta hidden when player did not participate in the latest session

**Files changed:**
- `src/pages/RankingPage.tsx` — restructured right column in the all-tab rows; restored `RankTrend` component with conditional render

---

## Recommendation 2 — Points Breakdown in Match History ❌ Removed

Implemented then removed — the breakdown clutter outweighed its value at the match-row level.

---

## Recommendation 3 — Win Rate by Match Type (PlayerDetailPage)

**Why:** A player's singles and doubles ability are completely different skills. The data exists (each match has `match_type`, and player results are linked). Currently there's no way to know if someone is a great singles player but a weak doubles partner.

**What to build:**
- A stats breakdown below the 4-cell summary on `PlayerDetailPage`:
  - Row per played match type: Men's Doubles | Mixed | Singles
  - Columns: Played, Win %, Wins
- Or integrate into the Partners tab header as context

**Files to touch:**
- `src/pages/PlayerDetailPage.tsx` — stats section
- `src/hooks/usePlayerMatchHistory.ts` — group results by `match_type` client-side (no DB changes)

**Effort:** Low-Medium.

---

## Recommendation 4 — Elo Rating History Chart (PlayerDetailPage) ✅ Done

**Implemented:** SVG line chart rendered above the tab bar on `PlayerDetailPage` (always visible, not tab-scoped).
- X = session `started_at`, Y = `rating_after` from the last match in the session
- Open circle dots per session; filled dot + ★ marker for sessions the player won (rank 1)
- Auto-scaled Y axis with grid lines and tick labels; up to 5 X-axis date labels

**Files changed:**
- `src/components/RatingChart.tsx` — new pure SVG chart component
- `src/pages/PlayerDetailPage.tsx` — imports chart, computes `chartData` from `usePlayerPointsHistory` + `achievements`, renders above `SegmentedControl`
- `src/i18n.tsx` — added `players.ratingHistory` (EN + VI)

---

## Recommendation 5 — Share Card for Player Profile ✅ Done

**Implemented:** Share button (Share2 icon) in the ⋮ menu on `PlayerDetailPage` generates a PNG card and opens a preview modal before calling `navigator.share`.

**Files changed:**
- `src/lib/share-card.ts` — `generatePlayerCard()`: canvas PNG with player name, rank pill (#N), 4 stats (ELO / WIN% / WINS / LOSSES), optional top badge, footer
- `src/pages/PlayerDetailPage.tsx:184` — `handleShareProfile()` triggered from ⋮ menu; preview modal at line 875 with Cancel / Share buttons

---

## Recommendation 6 — Recent Form Strip (RankingPage) ❌ Removed

Considered then removed — not a good fit for this UI.

---

## Recommendation 7 — Points Source Breakdown (History Tab)

**Why:** Players frequently ask "why did I get only X points this week?" The scoring formula has 4 components — base, attendance bonus, score bonus, strength bonus — but only the total is shown. This builds trust and gamifies the formula.

**What to build:**
- In the History tab's per-session expandable panel, below the match list, add a breakdown row:
  `Base X  +  Attend +Y  +  Score +Z  +  Strength +W  =  Total`
- Data: `base_points`, `attendance_points`, `score_bonus`, `strength_bonus` from `player_match_results` — already fetched by `usePlayerPointsHistory`, just not exposed in the UI

**Files to touch:**
- `src/hooks/usePlayerPointsHistory.ts` — expose the 4 bonus fields on `MatchPointsEntry`
- `src/pages/PlayerDetailPage.tsx` — History tab session row: sum bonuses and render breakdown
- `src/i18n.tsx` — add label keys (EN + VI)

**Effort:** Low.

---

## Recommendation 8 — Win-Rate Trend (PlayerDetailPage Stats Panel)

**Why:** The current 4-cell stats panel shows all-time win%. That hides whether a player is improving or declining. A "last 5 sessions" win rate next to the all-time number tells the real story.

**What to build:**
- In the Win % stats cell, add a secondary label: `Last 5: 72%`
- Computed from the last 5 session groups in `sessionHistory` (already available in state)
- Optionally add a small ↑/↓ arrow vs the all-time rate

**Files to touch:**
- `src/pages/PlayerDetailPage.tsx` — stats panel Win % cell: derive + render `recentWinRate`

**Effort:** Very Low (pure client-side compute, no new hooks or queries).

---

## Priority Order

| # | Feature | Effort | Impact | Status |
|---|---------|--------|--------|--------|
| 1 | Most Improved on ranking list | Very Low | High | ✅ Done |
| 2 | Points breakdown in match history | Low | High | ❌ Removed |
| 3 | Win rate by match type | Low | Medium | — |
| 4 | Elo rating history chart | Medium | High | ✅ Done |
| 5 | Player profile share card | Medium | Medium | ✅ Done |
| 6 | Recent Form Strip (ranking list) | Low | High | ❌ Removed |
| 7 | Points source breakdown (History tab) | Low | Medium | — |
| 8 | Win-rate trend (last 5 sessions) | Very Low | Medium | — |

## Verification (for any of these)
- `npm run dev` → navigate to affected page and verify data renders correctly
- `npm run build` → confirm no TypeScript errors
- `npm run test` → run existing test suite to catch regressions
