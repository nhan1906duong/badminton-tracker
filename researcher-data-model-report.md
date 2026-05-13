# Badminton Match Tracker - Data Model Design Report

**Date:** 2026-05-13
**Author:** Researcher Agent

---

## 1. Core Data Models / Entities

### 1.1 Player Entity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| name | String | Yes | Display name (max 100 chars) |
| email | String | Yes | Unique, for login/contact |
| phone | String | No | Contact phone |
| gender | Enum | No | 'MALE', 'FEMALE', 'OTHER' |
| joinDate | DateTime | Yes | Account creation date |
| activeStatus | Boolean | Yes | Default true |
| avatarUrl | String | No | Profile image URL |
| createdAt | DateTime | Yes | System timestamp |
| updatedAt | DateTime | Yes | Last modification |

### 1.2 Match Entity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| matchType | Enum | Yes | 'SINGLES', 'DOUBLES', 'MIXED_DOUBLES' |
| matchFormat | Enum | Yes | 'GAME_TO_21', 'GAME_TO_15', 'BEST_OF_3' |
| matchDate | DateTime | Yes | When match occurred |
| venue | String | No | Location name |
| duration | Integer | No | Match duration in minutes |
| status | Enum | Yes | 'COMPLETED', 'IN_PROGRESS', 'CANCELLED' |
| createdBy | UUID | Yes | FK to Player (organizer) |
| createdAt | DateTime | Yes | System timestamp |

### 1.3 MatchTeam Entity (Enables Future Extensibility)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| matchId | UUID | Yes | FK to Match |
| teamSide | Enum | Yes | 'TEAM_A', 'TEAM_B' |
| isWinner | Boolean | Yes | Final outcome |
| eloChange | Integer | No | ELO change after match |
| eloAfter | Integer | No | New ELO rating |

### 1.4 MatchParticipant Entity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| matchId | UUID | Yes | FK to Match |
| teamId | UUID | Yes | FK to MatchTeam |
| playerId | UUID | Yes | FK to Player |
| position | Enum | No | 'LEFT', 'RIGHT' (for doubles) |
| isWinner | Boolean | Yes | Individual outcome |

### 1.5 MatchScore Entity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| matchId | UUID | Yes | FK to Match |
| teamId | UUID | Yes | FK to MatchTeam |
| gameNumber | Integer | Yes | 1, 2, 3 (games in match) |
| points | Integer | Yes | Score for this game |
| isWinGame | Boolean | Yes | Won this game |

### 1.6 ELO Rating Entity (Future)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| playerId | UUID | Yes | FK to Player |
| matchType | Enum | Yes | 'SINGLES', 'DOUBLES', 'MIXED_DOUBLES' |
| eloRating | Integer | Yes | Current ELO (default 1000) |
| gamesPlayed | Integer | Yes | Total matches played |
| gamesWon | Integer | Yes | Total wins |
| updatedAt | DateTime | Yes | Last rating change |

---

## 2. Entity Relationships

```
┌─────────────┐
│   Player    │ (1) ────── (*) PlayerStatistics
└─────────────┘
     │
     │ (1)
     │ ────── (*) ELORating
     │
     │ (1)
     ├─────── (*) Match (as creator/organizer)
     │
     │ (1)
     └─────── (*) MatchParticipant ── (1) ──── MatchTeam ── (2) ──── Match
                           │                              │
                           │                              │ (1)
                           └──────── (1) ─────────────────┘
```

### Relationship Summary

| Relationship | Type | Description |
|--------------|------|-------------|
| Player -> ELORating | 1:Many | Per match type |
| Player -> MatchParticipant | 1:Many | Historical participation |
| Match -> MatchTeam | 1:2 | Always 2 teams per match |
| MatchTeam -> MatchParticipant | 1:2-4 | 2 for singles, 4 for doubles |
| Match -> MatchScore | 1:Many | Variable games per match |

---

## 3. Match Format Extensibility

### Strategy: Composite Key Approach

The design handles match formats via the `MatchTeam` + `MatchParticipant` structure rather than hardcoding player counts.

| Match Type | Participants | Implementation |
|------------|--------------|----------------|
| Men's Singles | 2 players | 2 participants, TEAM_A vs TEAM_B |
| Men's Doubles | 4 players | 4 participants, 2 per team |
| Women's Doubles | 4 players | 4 participants, 2 per team |
| Mixed Doubles | 4 players | 2 male + 2 female, 1 per team |
| Men's Team | 8+ players | Multiple participants per team |

### Code Example

```javascript
// Match type configuration
const MATCH_CONFIG = {
  SINGLES: { playersPerTeam: 1, maxGames: 1 },
  DOUBLES: { playersPerTeam: 2, maxGames: 3 },
  MIXED_DOUBLES: { playersPerTeam: 2, maxGames: 3, genderBalance: true }
};

// Validation: auto-enforce correct participant count
function validateParticipants(matchType, participants) {
  const required = MATCH_CONFIG[matchType].playersPerTeam * 2;
  return participants.length === required;
}
```

---

## 4. Scoring System Design

### What to Store

1. **Per-Game Scores**: Each game stored separately for analysis
2. **Point History**: Optional tracking of momentum/rally data
3. **Winning Margin**: Derived from scores (can be computed)

### Flexible Score Schema

```json
{
  "matchId": "uuid",
  "games": [
    { "teamA": 21, "teamB": 18, "winner": "TEAM_A" },
    { "teamA": 15, "teamB": 21, "winner": "TEAM_B" },
    { "teamA": 21, "teamB": 19, "winner": "TEAM_A" }
  ],
  "totalPoints": { "teamA": 57, "teamB": 58 },
  "matchDuration": 45
}
```

### Score Variations Supported

| Format | Games | Points | Storage |
|--------|-------|--------|---------|
| Game to 21 | 1-3 | 0-30+ | MatchScore records |
| Game to 15 | 1-3 | 0-21 | Same structure |
| First to 30 | 1 | 0-30 | Same structure |

---

## 5. Ranking / ELO System Design

### ELO Implementation

```
K-Factor: 32 (standard), 16 (established players >2100)
Initial Rating: 1000
Expected Score: E = 1 / (1 + 10^((Ra - Rb) / 400))
New Rating: Rn = Ro + K(S - E)
```

### ELO Per Match Type

Store separate ELO ratings per match type because:
- A player may excel in singles but struggle in doubles
- Mixed doubles requires different skill sets
- Fairer leaderboards and matchmaking

### Schema Design

```sql
CREATE TABLE elo_ratings (
  player_id UUID REFERENCES players(id),
  match_type VARCHAR(20) NOT NULL,
  elo_rating INTEGER DEFAULT 1000,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  win_rate DECIMAL(4,2) GENERATED ALWAYS AS (games_won::DECIMAL / NULLIF(games_played, 0) * 100) STORED,
  updated_at TIMESTAMP,
  PRIMARY KEY (player_id, match_type)
);
```

### Leaderboard Query

```sql
SELECT
  p.name,
  e.elo_rating,
  e.games_played,
  e.games_won,
  e.win_rate,
  RANK() OVER (ORDER BY e.elo_rating DESC) as rank
FROM elo_ratings e
JOIN players p ON p.id = e.player_id
WHERE e.match_type = 'DOUBLES'
  AND e.games_played >= 10
ORDER BY e.elo_rating DESC;
```

---

## 6. Statistics Derivable from Match Data

### Player Statistics

| Stat | Calculation | Source |
|------|-------------|--------|
| Win Rate | wins / total * 100 | MatchParticipant |
| Matches Played | COUNT | MatchParticipant |
| Total Wins | COUNT WHERE isWinner | MatchParticipant |
| Avg Match Duration | AVG | Match |
| Favorite Venue | MODE | Match.venue |
| Strongest Partner | Most wins co-occurring | MatchParticipant |
| Head-to-Head (vs X) | Filtered matches | MatchParticipant |
| Recent Form | Last N matches trend | MatchParticipant |
| Peak ELO | MAX | ELORating |

### Team Statistics

| Stat | Calculation | Source |
|------|-------------|--------|
| Team Win Rate | wins / total | MatchTeam |
| Avg Score | AVG(points) | MatchScore |
| Biggest Margin | MAX(points - opponent) | MatchScore |
| Win Streak | Longest consecutive wins | MatchTeam |

### Global Statistics

| Stat | Calculation | Source |
|------|-------------|--------|
| Total Matches | COUNT | Match |
| Most Active Player | Most participation | MatchParticipant |
| Busiest Venue | Most matches | Match.venue |
| Popular Match Type | MODE | Match.matchType |
| Avg Match Duration | AVG | Match |

---

## 7. Database Schema

### SQL Schema (PostgreSQL Recommended)

```sql
-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active_status BOOLEAN DEFAULT true,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('SINGLES', 'DOUBLES', 'MIXED_DOUBLES')),
  match_format VARCHAR(20) DEFAULT 'GAME_TO_21',
  match_date TIMESTAMP NOT NULL,
  venue VARCHAR(200),
  duration_minutes INTEGER,
  status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'IN_PROGRESS', 'CANCELLED')),
  created_by UUID REFERENCES players(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match teams table
CREATE TABLE match_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_side VARCHAR(10) NOT NULL CHECK (team_side IN ('TEAM_A', 'TEAM_B')),
  is_winner BOOLEAN DEFAULT false,
  elo_change INTEGER,
  elo_after INTEGER,
  UNIQUE(match_id, team_side)
);

-- Match participants table
CREATE TABLE match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES match_teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  position VARCHAR(10) CHECK (position IN ('LEFT', 'RIGHT')),
  is_winner BOOLEAN DEFAULT false,
  UNIQUE(match_id, player_id)
);

-- Match scores table
CREATE TABLE match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES match_teams(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL CHECK (game_number BETWEEN 1 AND 5),
  points INTEGER NOT NULL CHECK (points >= 0),
  is_win_game BOOLEAN DEFAULT false,
  UNIQUE(match_id, team_id, game_number)
);

-- ELO ratings table
CREATE TABLE elo_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id),
  match_type VARCHAR(20) NOT NULL,
  elo_rating INTEGER DEFAULT 1000,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(player_id, match_type)
);

-- Indexes for query performance
CREATE INDEX idx_matches_date ON matches(match_date DESC);
CREATE INDEX idx_matches_type ON matches(match_type);
CREATE INDEX idx_participants_player ON match_participants(player_id);
CREATE INDEX idx_elo_rating ON elo_ratings(elo_rating DESC);
CREATE INDEX idx_teams_match ON match_teams(match_id);
```

### NoSQL Alternative (MongoDB)

```javascript
// matches collection
{
  _id: ObjectId,
  matchType: "DOUBLES",
  matchDate: ISODate,
  venue: "City Hall",
  status: "COMPLETED",
  createdBy: ObjectId,
  teams: [
    {
      side: "TEAM_A",
      isWinner: true,
      eloChange: 16,
      participants: [
        { playerId: ObjectId, position: "LEFT" },
        { playerId: ObjectId, position: "RIGHT" }
      ],
      scores: [
        { game: 1, points: 21 },
        { game: 2, points: 18 },
        { game: 3, points: 21 }
      ]
    },
    {
      side: "TEAM_B",
      isWinner: false,
      participants: [...],
      scores: [...]
    }
  ]
}
```

---

## 8. Feature Support Matrix

| Feature | Supported | Implementation |
|---------|-----------|----------------|
| Player management | Yes | Player entity |
| Match recording | Yes | Match + MatchTeam + MatchParticipant |
| Default Mens Doubles | Yes | matchType: 'DOUBLES' |
| Singles matches | Yes | matchType: 'SINGLES' |
| Mixed doubles | Yes | matchType: 'MIXED_DOUBLES' |
| Optional scoring | Yes | MatchScore (nullable) |
| Rankings/ELO | Yes | ELORating entity |
| Leaderboard | Yes | ELORating + queries |
| Summary statistics | Yes | Derived from Match data |
| Charts/Reports | Yes | Aggregated match data |
| Multi-user viewing | Yes | Shared database, no user-specific data isolation |
| Win rate tracking | Yes | MatchParticipant aggregation |
| Head-to-head | Yes | MatchParticipant queries |
| Partner statistics | Yes | MatchParticipant co-occurrence |

---

## 9. API Design Considerations

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /players | GET, POST | List/create players |
| /players/:id | GET, PUT, DELETE | Player CRUD |
| /matches | GET, POST | List/create matches |
| /matches/:id | GET | Match details with teams/scores |
| /matches/:id/teams | POST | Add teams to match |
| /matches/:id/scores | POST | Record game scores |
| /stats/player/:id | GET | Player statistics |
| /stats/leaderboard | GET | ELO rankings |
| /stats/venues | GET | Venue statistics |

---

## 10. Recommendations

1. **Database Choice**: PostgreSQL for relational integrity, complex queries, and ELO ranking performance
2. **Initial Scope**: Start with Player, Match, MatchTeam, MatchParticipant (skip ELO initially)
3. **Future Migration**: ELO system can be added without schema changes
4. **Scoring**: Store per-game scores even if optional - enables advanced analytics later
5. **Indexing**: Create composite indexes on (player_id, match_date) for performance

---

## Unresolved Questions

1. **Authentication**: What auth mechanism? (Firebase, Supabase Auth, custom JWT?)
2. **Real-time sync**: Need WebSocket support for live match updates?
3. **Data retention**: Any archival/deletion policies for old matches?
4. **Multi-tenancy**: Single organization or multiple clubs/venues?
5. **Offline support**: Mobile app needs local-first capability?

---

## Sources

- No external sources consulted (based on established database design patterns)