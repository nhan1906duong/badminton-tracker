# Brainstorm Report: Session Types Expansion

## Problem Statement

Current sessions are implicitly typed (regular vs tournament via `bwf_tournament_id`). Need explicit 3-type system:

| Type | Description |
|------|-------------|
| **regular** | Free-form name, ad-hoc matches |
| **tournament** | Linked to BWF world tour (already partially exists) |
| **league** | Fixed teams, single match type, round-robin, team standings |

## Requirements (Final)

1. Up to 4 teams per league (optimized for 4)
2. Scoring: 2 pts win, 0 pts loss
3. Single match type per league (MD/MS/WD/WS/XD decided at creation)
4. Multi-step wizard for league creation
5. Players can be in multiple teams across different leagues
6. Team standings + individual player rankings both tracked

## Evaluated Approaches

### Option A: Minimal League (Recommended)

**New DB tables:**
- `league_teams` (id, session_id, name)
- `league_team_players` (league_team_id, player_id)

**Schema changes:**
- `sessions.type`: `'regular' | 'tournament' | 'league'`
- `sessions.league_match_type`: MatchType (nullable)
- `sessions.league_total_rounds`: INT (nullable, default 2)

**Match behavior:**
- Reuses existing `matches` + `match_teams` + `match_participants` tables
- League match creation: pick team A → pick players from roster → pick team B → pick players
- Team standings derived from completed matches + player→team mapping
- Round-robin schedule computed client-side, displayed as guide

**Pros:** Minimal DB changes, reuses all match infrastructure, simple
**Cons:** Schedule is advisory not enforced

### Option B: Fixtures-Based League

**Additional tables:**
- `fixtures` (id, session_id, team_a_id, team_b_id, round_number)
- `matches.fixture_id` FK

**Pros:** Enforced structure, rigid round-robin
**Cons:** Overkill for casual play, complex UI, more tables

### Option C: Hybrid Advisory Schedule

**Additional table:**
- `league_schedule` (round, team_a_id, team_b_id) — advisory only

**Pros:** Guided without rigidity
**Cons:** Redundant — can compute client-side from team count

## Final Recommended Solution: Option A

### Database Schema

```
sessions
├── id UUID PK
├── type: 'regular' | 'tournament' | 'league'    -- NEW
├── label TEXT
├── started_at TIMESTAMPTZ
├── ended_at TIMESTAMPTZ
├── bwf_tournament_id UUID FK                    -- tournament type only
├── league_match_type TEXT                       -- NEW (nullable)
├── league_total_rounds INT DEFAULT 2            -- NEW (nullable)
├── created_by UUID FK
└── created_at TIMESTAMPTZ

league_teams                                     -- NEW TABLE
├── id UUID PK
├── session_id UUID FK → sessions
├── name TEXT
└── created_at TIMESTAMPTZ

league_team_players                              -- NEW TABLE
├── league_team_id UUID FK → league_teams
├── player_id UUID FK → players
└── PK(league_team_id, player_id)

-- Existing tables unchanged:
-- matches, match_teams, match_participants, match_scores
-- player_match_results (team standings derived from this)
```

### Migration Strategy

1. Add `type` to sessions, default 'regular'
2. Update existing rows: `bwf_tournament_id IS NOT NULL` → type='tournament'
3. Add nullable `league_match_type`, `league_total_rounds`
4. Create `league_teams`, `league_team_players` tables
5. Update RLS policies for new tables

### League Match Type → Team Size

| League Match Type | Players per Team | Team Roster Min |
|-------------------|------------------|-----------------|
| MS | 1 | 1 |
| WS | 1 | 1 |
| MD | 2 | 2 |
| WD | 2 | 2 |
| XD | 2 (1M+1F) | 2 |

### Round-Robin Schedule (Client-Side)

With N teams, generates (N-1) rounds per cycle. Each team plays every other team once.

Example (4 teams, 2 rounds = 6 rounds total):
```
Round 1: A vs B, C vs D
Round 2: A vs C, B vs D
Round 3: A vs D, B vs C
Round 4: A vs B, C vs D  -- round 2 begins
Round 5: A vs C, B vs D
Round 6: A vs D, B vs C
```

Algorithm: circle method. Fixed team, rotate others.

### Team Standings Derivation

```
For each completed match in league session:
  1. Get winning match_team (match_teams.is_winner = true)
  2. Get all players in winning match_team
  3. Map players to league teams via league_team_players
  4. All players on same league team → that team won
  5. Winning team: W+1, Pts+2
  6. Losing team: L+1, Pts+0

Sort: Points DESC, Wins DESC
```

Champion = top team when session ends. All players in that team get champion credit.

### Individual Rankings

Unchanged. `player_match_results` still created per match. Elo/weekly points calculated same as regular sessions. League is a "container" with team overlay.

### UI Flow

#### Creation Wizard (League)

```
Step 1: Pick Type
  ├─ Regular session (name input)
  ├─ Tournament (BWF list pick)
  └─ League (→ Step 2)

Step 2: League Config
  ├─ Name
  ├─ Match type: [MS | WS | MD | WD | XD]
  └─ Rounds: [1 | 2]

Step 3: Create Teams
  ├─ Team 1: name + add players (picker)
  ├─ Team 2: name + add players
  ├─ Team 3: name + add players (optional)
  └─ Team 4: name + add players (optional)
  
  Validation: each team has >= required players for match type

Step 4: Review → Create
```

#### League Session Detail Page

```
┌─────────────────────────────┐
│  < Back    League · LIVE    │
├─────────────────────────────┤
│  My League                  │
│  MD · 4 Teams · 2 Rounds    │
│  Today · 2h 15m             │
├─────────────────────────────┤
│  STANDINGS                  │
│  ┌────┬────┬───┬───┬────┐  │
│  │Team│ Pld│ W │ L │ Pts│  │
│  ├────┼────┼───┼───┼────┤  │
│  │Red │  3 │ 3 │ 0 │  6 │  │
│  │Blue│  3 │ 1 │ 2 │  2 │  │
│  │... │    │   │   │    │  │
│  └────┴────┴───┴───┴────┘  │
├─────────────────────────────┤
│  SCHEDULE                   │
│  Round 1  [view all rounds] │
│  Red vs Blue    [Play →]    │
│  Green vs Yellow [3-1] ✓    │
├─────────────────────────────┤
│  MATCHES                    │
│  [same list as today]       │
└─────────────────────────────┘
```

Tabbed or scrollable sections. FAB = "Add Match" (live only).

#### League Match Creation

Pre-filled based on schedule cell tapped, or free-form:
1. Pre-select Team A and Team B
2. Pick players from each team roster (filtered by match type)
3. Rest same as current match creation

### Files to Modify / Create

| File | Action | Notes |
|------|--------|-------|
|`supabase/migrations/014_session_types.sql`|Create|Add type, league columns, new tables, RLS|
|`src/types/database.ts`|Update|Add SessionType, LeagueTeam, etc.|
|`src/hooks/useSessions.ts`|Update|Create session accepts type+league config|
|`src/hooks/useLeagueTeams.ts`|Create|CRUD for league teams + players|
|`src/hooks/useLeagueStandings.ts`|Create|Derive team standings from matches|
|`src/lib/round-robin.ts`|Create|Schedule generation algorithm|
|`src/pages/CreateSessionPage.tsx`|Update|Add type picker, multi-step wizard|
|`src/pages/SessionDetailPage.tsx`|Update|Conditional league UI (standings + schedule)|
|`src/pages/CreateMatchPage.tsx`|Update|League mode: pre-fill teams, roster pickers|
|`design-system/components/`|Create|League standings table, schedule grid|

### Implementation Considerations

1. **Session type is immutable** after creation — no converting league → regular
2. **League teams are session-scoped** — same player can be on different teams in different leagues
3. **Standings are derived, not stored** — computed from match history (same pattern as session leaderboard)
4. **Round-robin schedule is advisory** — user can create matches outside schedule (flexibility)
5. **Ending a league session** same as regular: computes Elo, writes results, marks ended. Team champion displayed.

### Risks

| Risk | Mitigation |
|------|------------|
| Standings query gets slow with many matches | Add index on `match_participants.player_id`, cache standings in React Query |
| Player leaves team mid-league | Not supported — roster fixed. Edge case, ignore for v1. |
| Team with more players than match requires | Allow roster > required. UI shows roster, user picks who plays. |
| Schedule cell tapped but match already created | Track by (round, team_a, team_b) key. Show "Play" or result. |

### Success Criteria

- [ ] Can create regular session (same as today)
- [ ] Can create tournament session (same as today)
- [ ] Can create league session via 3-step wizard
- [ ] League detail shows team standings table
- [ ] League detail shows round-robin schedule
- [ ] Creating league match pre-fills teams from schedule or manual pick
- [ ] Team champion determined correctly when session ends
- [ ] Individual player rankings still work in league sessions
- [ ] All existing sessions continue working (backward compatible)

## Unresolved Questions

None — all clarified.
