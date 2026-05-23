# Player Rating & Point System Spec

## Overview

The app uses two independent scoring systems that serve different purposes:

| System | Purpose | Updated |
|---|---|---|
| **Weekly Points** | Visible per-session tournament score | When a match result is recorded |
| **Skill Rating** | Long-term Elo-style player strength | When a session ends |

Keeping them separate prevents highly active players from always dominating the all-time leaderboard, while still rewarding performance within a single session.

---

## 1. Weekly Points System

### Formula

```
Match Points = Base Points + Attendance + Score Bonus + Strength Bonus
```

Minimum match points: **1** (a player who participates always earns at least 1 point).

### Base Points

| Result | Points |
|---|---:|
| Win | +10 |
| Loss | +3 |

### Attendance

All players who participate in a match receive **+1**.

### Score Bonus

**Winner — score difference bonus**

```
difference = winnerScore - loserScore
```

| Difference | Bonus |
|---:|---:|
| 1 – 3 | +1 |
| 4 – 7 | +2 |
| 8 – 15 | +3 |
| 16+ | +4 |

**Loser — close game bonus**

| Loser's final score | Bonus |
|---:|---:|
| 20+ | +3 |
| 18 – 19 | +2 |
| 15 – 17 | +1 |
| 0 – 14 | +0 |

### Strength Bonus

Team ratings are compared before each match.

```
teamRating = average(player1.rating, player2.rating)
ratingGap  = opponentTeamRating - winnerTeamRating
```

**Winner — upset bonus** (`ratingGap` = opponent avg − winner avg)

| Situation | Gap range | Bonus |
|---|---:|---:|
| Beat much weaker team | < −100 | +0 |
| Beat similar team | −100 to 100 | +1 |
| Beat stronger team | 101 to 250 | +2 |
| Beat much stronger team | 251 to 400 | +4 |
| Beat extremely stronger team | 401+ | +6 |

**Loser — strength penalty** (positive gap = loser was stronger = lost to weaker team)

| Situation | Gap | Adjustment |
|---|---:|---:|
| Lost to stronger or similar | ≤ 100 | 0 |
| Lost to weaker team | 101 to 250 | −1 |
| Lost to much weaker team | 251+ | −2 |

### Example

> Player A (rating 900) and Player B (rating 800) beat Player C (1200) and Player D (1100). Score: 21–18.

```
Team AB avg rating = (900 + 800) / 2 = 850
Team CD avg rating = (1200 + 1100) / 2 = 1150
ratingGap = 1150 - 850 = 300

Winners (A, B):
  base          = 10
  attendance    = 1
  score bonus   = diff 3 → +1
  strength bonus= gap 300 → +4
  total         = 16 pts each

Losers (C, D):
  base          = 3
  attendance    = 1
  close game    = loser scored 18 → +2
  strength adj  = lost to weaker (gap = 1150 - 850 = 300 > 250) → -2
  total         = 4 pts each
```

---

## 2. Skill Rating System (Elo)

### Initial Rating

All players start at **1000**.

### Team Rating

```
teamRating = (player1.rating + player2.rating) / 2
```

### Expected Win Rate

```
expectedA = 1 / (1 + 10 ^ ((teamBRating - teamARating) / 400))
expectedB = 1 - expectedA
```

### Rating Update

```
newRating = oldRating + K × (actualResult - expectedResult)
```

| Variable | Value |
|---|---|
| K | 32 |
| Win (actualResult) | 1 |
| Loss (actualResult) | 0 |

Both players on the same team receive the **same rating delta**.

### Examples

```
Team A avg: 1000, Team B avg: 1200
expectedA = 1 / (1 + 10^((1200-1000)/400)) = 0.24

Team A wins:
  deltaA = 32 × (1 - 0.24) = +24
  deltaB = 32 × (0 - 0.76) = -24

Team A loses:
  deltaA = 32 × (0 - 0.24) = -8
  deltaB = 32 × (1 - 0.76) = +8
```

---

## 3. Update Timing

### Weekly points — on match result save

`useRecordResult()` fetches current player ratings, calculates the weekly point breakdown for each participant, and upserts rows into `player_match_results`. Rating columns (`rating_before`, `rating_after`, `rating_delta`) are left `null` at this stage.

### Elo ratings — on session end

`useEndSession()` processes all completed matches in the session in **played_at ascending** order. It runs Elo calculations match-by-match (running updates, not a single batch), fills in the rating columns in `player_match_results`, and writes the final ratings back to `players.rating`.

Using running updates within a session means each match uses the rating state after all previous matches in the same session, which more accurately reflects player strength throughout the session.

---

## 4. Leaderboard Sorting

### Overall ranking (Ranking → Overall tab)

Sorted by, in priority order:

1. `rating` DESC
2. `averageWeeklyPoints` DESC
3. `winRate` DESC
4. `pointDifference` DESC

### Weekly ranking (Ranking → This Session tab)

Filtered to the currently open session, sorted by:

1. `weeklyPoints` DESC
2. `wins` DESC
3. `pointDifference` DESC

---

## 5. Data Model

### `players` (extended)

| Column | Type | Notes |
|---|---|---|
| `rating` | `INTEGER` | Elo rating, default 1000 |

### `player_match_results`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `player_id` | `UUID` | FK → players |
| `match_id` | `UUID` | FK → matches |
| `session_id` | `UUID` | FK → sessions |
| `is_winner` | `BOOLEAN` | |
| `team_score` | `INTEGER` | This player's team final score |
| `opponent_score` | `INTEGER` | Opponent team final score |
| `base_points` | `INTEGER` | 10 or 3 |
| `attendance_points` | `INTEGER` | Always 1 |
| `score_bonus` | `INTEGER` | Diff bonus or close game bonus |
| `strength_bonus` | `INTEGER` | Upset bonus or penalty |
| `total_weekly_points` | `INTEGER` | Sum, minimum 1 |
| `rating_before` | `INTEGER` | Null until session ends |
| `rating_after` | `INTEGER` | Null until session ends |
| `rating_delta` | `INTEGER` | Null until session ends |
| `created_at` | `TIMESTAMPTZ` | |

Unique constraint: `(player_id, match_id)` — prevents duplicate rows if a result is re-saved.

---

## 6. Pure Functions (`src/lib/rating.ts`)

| Function | Description |
|---|---|
| `calculateScoreDifferenceBonus(winnerScore, loserScore)` | Winner's score diff bonus |
| `calculateCloseGameBonus(loserScore)` | Loser's consolation bonus |
| `calculateMatchPoints(input)` | Full weekly point breakdown |
| `calculateExpectedWinRate(teamRating, opponentTeamRating)` | Elo expected value |
| `calculateRatingDelta(expected, actual, k?)` | Elo delta for one player |
| `teamAvgRating(ratings[])` | Average rating for a doubles team |

All functions are pure with no side effects. `SCORING_CONFIG` holds all numeric constants (K factor, base points, min points, initial rating) to avoid magic numbers.

---

## 7. Recalculation

`useRecalculateAllRatings()` in `useSessions.ts` replays the entire match history:

1. Resets all `players.rating` to 1000.
2. Deletes all `player_match_results`.
3. Iterates sessions in `started_at ASC` order.
4. Within each session, iterates completed matches in `played_at ASC` order.
5. **Ended sessions**: calculates weekly points + Elo, writes all fields, advances the running rating map.
6. **Open sessions**: calculates weekly points only using current running ratings; rating columns stay `null` (filled when that session later ends).
7. Persists final ratings to `players`.

Triggered via **Settings → Recalculate All Ratings** (two-tap confirm guard). Use whenever historical sessions need to be retroactively processed, or after data corrections.

---

## 8. Configuration Reference (`SCORING_CONFIG`)

```ts
{
  initialRating:  1000,
  kFactor:          32,
  winBasePoints:    10,
  lossBasePoints:    3,
  attendancePoints:  1,
  minMatchPoints:    1,
}
```
