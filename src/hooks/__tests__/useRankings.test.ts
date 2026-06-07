import { describe, expect, it } from 'vitest'
import { buildSessionWeeklyRankings, computeRankChanges, computeSessionRankingHistory } from '../useRankings'
import type { PlayerRankingStats } from '../useRankings'

const players = [
  { id: 'p1', name: 'Alice', avatar_url: null },
  { id: 'p2', name: 'Bob', avatar_url: null },
  { id: 'p3', name: 'Carol', avatar_url: null },
]

function result(
  playerId: string,
  matchId: string,
  isWinner: boolean,
  weeklyPoints: number,
  teamScore = 21,
  opponentScore = 15,
) {
  return {
    session_id: 's1',
    match_id: matchId,
    player_id: playerId,
    is_winner: isWinner,
    team_score: teamScore,
    opponent_score: opponentScore,
    total_weekly_points: weeklyPoints,
    rating_delta: null,
  }
}

describe('buildSessionWeeklyRankings — weeklyPoints sort', () => {
  it('ranks by total weekly points, not average', () => {
    // Alice: 2 matches × 16 pts = 32 total, avg 16
    // Bob:   4 matches × 14 pts = 56 total, avg 14
    // Bob has higher raw total so Bob wins despite lower average
    const results = [
      result('p1', 'm1', true, 16),
      result('p1', 'm2', true, 16),
      result('p2', 'm3', true, 14),
      result('p2', 'm4', true, 14),
      result('p2', 'm5', true, 14),
      result('p2', 'm6', true, 14),
    ]
    const rankings = buildSessionWeeklyRankings(players, results)
    expect(rankings[0].playerId).toBe('p2')  // Bob wins on total (56 > 32)
    expect(rankings[0].weeklyPoints).toBe(56)
    expect(rankings[1].playerId).toBe('p1')
    expect(rankings[1].weeklyPoints).toBe(32)
  })

  it('uses averageWeeklyPoints as tiebreaker when totals are equal', () => {
    // Alice: 2 matches × 14 pts = 28 total, avg 14
    // Bob:   2 matches with 16+12 = 28 total, avg 14 (same avg too — falls to wins)
    // Carol: 4 matches with 7 pts each = 28 total, avg 7
    const results = [
      result('p1', 'm1', true, 14),
      result('p1', 'm2', true, 14),   // 28 total, avg 14
      result('p3', 'm3', true, 7),
      result('p3', 'm4', true, 7),
      result('p3', 'm5', true, 7),
      result('p3', 'm6', true, 7),    // 28 total, avg 7
    ]
    const rankings = buildSessionWeeklyRankings(players, results)
    expect(rankings[0].playerId).toBe('p1')  // Alice wins tiebreaker on avg (14 > 7)
    expect(rankings[1].playerId).toBe('p3')
  })

  it('uses wins as tiebreaker when averages are equal', () => {
    // Alice: 2 matches, 1 win, avg 13
    // Bob:   2 matches, 2 wins, avg 13
    const results = [
      result('p1', 'm1', true, 16),
      result('p1', 'm2', false, 10),   // (16+10)/2 = 13 avg
      result('p2', 'm3', true, 14),
      result('p2', 'm4', true, 12),    // (14+12)/2 = 13 avg
    ]
    const rankings = buildSessionWeeklyRankings(players, results)
    expect(rankings[0].playerId).toBe('p2')  // Bob wins on wins (2 > 1)
    expect(rankings[1].playerId).toBe('p1')
  })

  it('uses pointDifference as second tiebreaker', () => {
    // Alice: 2 matches, 2 wins, avg 14, pointDiff = +5
    // Bob:   2 matches, 2 wins, avg 14, pointDiff = +10
    const results = [
      result('p1', 'm1', true, 14, 21, 16), // diff +5
      result('p1', 'm2', true, 14, 21, 16),
      result('p2', 'm3', true, 14, 21, 11), // diff +10
      result('p2', 'm4', true, 14, 21, 11),
    ]
    const rankings = buildSessionWeeklyRankings(players, results)
    expect(rankings[0].playerId).toBe('p2')  // Bob wins on pointDifference (20 > 10)
  })

  it('computes averageWeeklyPoints correctly', () => {
    const results = [
      result('p1', 'm1', true, 15),
      result('p1', 'm2', true, 12),
      result('p1', 'm3', false, 6),
    ]
    const rankings = buildSessionWeeklyRankings(players, results)
    const alice = rankings.find(r => r.playerId === 'p1')!
    expect(alice.weeklyPoints).toBe(33)
    expect(alice.averageWeeklyPoints).toBe(11)  // Math.round(33/3)
  })

  it('deduplicates results with same player+match id', () => {
    const results = [
      result('p1', 'm1', true, 14),
      result('p1', 'm1', true, 14), // duplicate
    ]
    const rankings = buildSessionWeeklyRankings(players, results)
    const alice = rankings.find(r => r.playerId === 'p1')!
    expect(alice.matchesPlayed).toBe(1)
    expect(alice.weeklyPoints).toBe(14)
  })

  it('returns empty array for no results', () => {
    expect(buildSessionWeeklyRankings(players, [])).toEqual([])
  })
})

describe('computeRankChanges', () => {
  function makeRanking(playerId: string, rank: number, rating: number): Pick<PlayerRankingStats, 'playerId' | 'rating' | 'rank'> {
    return { playerId, rating, rank }
  }

  function prevResult(playerId: string, sessionId: string, wins = true, points = 10): import('../useRankings').PrevResult {
    return { session_id: sessionId, player_id: playerId, is_winner: wins, total_weekly_points: points, team_score: 21, opponent_score: 15 }
  }

  it('detects a player who moved up after the last session', () => {
    // Player A: rating 1150 (gained +100 last session, so prevRating = 1050)
    // Player B: rating 1100 (no change, prevRating = 1100)
    // Current: A=rank1, B=rank2. Before: B=rank1, A=rank2 → A went up +1, B went down -1
    const rankings = [makeRanking('A', 1, 1150), makeRanking('B', 2, 1100)]
    const deltaMap = new Map([['A', 100]])
    const changes = computeRankChanges(rankings, [], deltaMap)
    expect(changes.get('A')).toBe(1)   // moved up 1
    expect(changes.get('B')).toBe(-1)  // moved down 1
  })

  it('breaks ties in prevRating by pre-session averageWeeklyPoints', () => {
    // All three players have identical prevRating (1000) — a 3-way tie.
    // Tie must be broken by pre-session avgWeeklyPoints.
    // winner: +200 Elo gain → prevRating=1000, 0 history → should be prevRank 3
    // p1:    +100 Elo gain → prevRating=1000, low avg history → should be prevRank 2
    // p3:      0 Elo gain → prevRating=1000, high avg history → should be prevRank 1
    //
    // Old code sorted prevRating-only (stable, so kept current-rank order [winner, p1, p3])
    // → gave prevRanks winner=1, p1=2, p3=3, so rankChanges were all 0 (wrong for winner/p3).
    // New code uses avgWeeklyPoints tiebreaker → correct prev ordering.
    const rankings = [
      makeRanking('winner', 1, 1200),  // +200 last session, prevRating=1000
      makeRanking('p1',    2, 1100),   // +100 last session, prevRating=1000
      makeRanking('p3',    3, 1000),   // +0   last session, prevRating=1000
    ]
    const deltaMap = new Map([['winner', 200], ['p1', 100]])

    // p3 has best pre-session avg (15); p1 has mid avg (5); winner has none (0)
    const prevResults = [
      prevResult('p3', 's0', true, 15),  // avg 15
      prevResult('p1', 's0', true, 5),   // avg 5
    ]

    const changes = computeRankChanges(rankings, prevResults, deltaMap)
    // p3 was prevRank 1 (highest avg), now rank 3 → -2
    expect(changes.get('p3')).toBe(-2)
    // p1 was prevRank 2, now rank 2 → 0
    expect(changes.get('p1')).toBe(0)
    // winner was prevRank 3 (no history), now rank 1 → +2
    expect(changes.get('winner')).toBe(2)
  })

  it('returns 0 for all players when there is no last session', () => {
    const rankings = [makeRanking('A', 1, 1100), makeRanking('B', 2, 1000)]
    const changes = computeRankChanges(rankings, [], new Map())
    expect(changes.get('A')).toBe(0)
    expect(changes.get('B')).toBe(0)
  })
})

describe('computeSessionRankingHistory', () => {
  const p = [
    { id: 'p1', name: 'Alice', avatar_url: null },
    { id: 'p2', name: 'Bob', avatar_url: null },
  ]

  function match(id: string, played_at: string, hasWinner = true) {
    return {
      id,
      status: 'COMPLETED',
      played_at,
      teams: [{ is_winner: hasWinner }, { is_winner: false }],
    }
  }

  function res(playerId: string, matchId: string, points: number) {
    return {
      session_id: 's1',
      match_id: matchId,
      player_id: playerId,
      is_winner: true,
      team_score: 21,
      opponent_score: 15,
      total_weekly_points: points,
      rating_delta: null,
    }
  }

  it('returns one history entry per completed match per player', () => {
    const matches = [
      match('m1', '2024-01-01T10:00:00Z'),
      match('m2', '2024-01-01T11:00:00Z'),
    ]
    const results = [
      res('p1', 'm1', 20),
      res('p2', 'm1', 15),
      res('p1', 'm2', 10),
    ]
    const histories = computeSessionRankingHistory(matches, results, p)
    const alice = histories.find(h => h.playerId === 'p1')!
    const bob = histories.find(h => h.playerId === 'p2')!
    expect(alice.history).toHaveLength(2)
    expect(bob.history).toHaveLength(2)  // Bob stays in ranking even after m2 (no new result)
  })

  it('sorts matches by played_at, not insertion order', () => {
    const matches = [
      match('m2', '2024-01-01T11:00:00Z'),
      match('m1', '2024-01-01T10:00:00Z'),
    ]
    const results = [
      res('p1', 'm1', 30),  // earlier match — should be matchIndex 1
      res('p1', 'm2', 10),  // later match — should be matchIndex 2
    ]
    const histories = computeSessionRankingHistory(matches, results, p)
    const alice = histories.find(h => h.playerId === 'p1')!
    // After m1: Alice has 30 pts. After m2: Alice has 40 pts total.
    expect(alice.history[0].matchIndex).toBe(1)
    expect(alice.history[1].matchIndex).toBe(2)
    // After m2, Bob (no results) should not appear
    expect(alice.history[0].weeklyPoints).toBe(30)
    expect(alice.history[1].weeklyPoints).toBe(40)
  })

  it('records cumulative weekly points (not per-match)', () => {
    const matches = [
      match('m1', '2024-01-01T10:00:00Z'),
      match('m2', '2024-01-01T11:00:00Z'),
    ]
    const results = [
      res('p1', 'm1', 20),
      res('p1', 'm2', 15),
    ]
    const histories = computeSessionRankingHistory(matches, results, p)
    const alice = histories.find(h => h.playerId === 'p1')!
    expect(alice.history[0].weeklyPoints).toBe(20)  // after m1
    expect(alice.history[1].weeklyPoints).toBe(35)  // after m2 (20+15)
  })

  it('rank reflects position among all players after each match', () => {
    const matches = [
      match('m1', '2024-01-01T10:00:00Z'),
      match('m2', '2024-01-01T11:00:00Z'),
    ]
    const results = [
      res('p1', 'm1', 10),
      res('p2', 'm1', 20),  // Bob leads after m1
      res('p1', 'm2', 30),  // Alice overtakes after m2 (total 40 vs Bob's 20)
    ]
    const histories = computeSessionRankingHistory(matches, results, p)
    const alice = histories.find(h => h.playerId === 'p1')!
    const bob = histories.find(h => h.playerId === 'p2')!
    expect(alice.history[0].rank).toBe(2)  // after m1: Bob 20 > Alice 10
    expect(bob.history[0].rank).toBe(1)
    expect(alice.history[1].rank).toBe(1)  // after m2: Alice 40 > Bob 20
    expect(bob.history[1].rank).toBe(2)
  })

  it('excludes matches without a winner', () => {
    const matchesWithNoWinner = [
      { id: 'm1', status: 'COMPLETED', played_at: '2024-01-01T10:00:00Z', teams: [{ is_winner: false }, { is_winner: false }] },
      match('m2', '2024-01-01T11:00:00Z'),
    ]
    const results = [res('p1', 'm2', 15)]
    const histories = computeSessionRankingHistory(matchesWithNoWinner, results, p)
    const alice = histories.find(h => h.playerId === 'p1')!
    expect(alice.history).toHaveLength(1)
    expect(alice.history[0].matchIndex).toBe(1)  // m2 becomes index 1 (m1 was excluded)
  })

  it('returns empty array when there are no completed matches', () => {
    const matches = [{ id: 'm1', status: 'LIVE', played_at: null, teams: [] }]
    const histories = computeSessionRankingHistory(matches, [], p)
    expect(histories).toHaveLength(0)
  })

  it('preserves avatarUrl and name from the players list', () => {
    const playersWithAvatar = [{ id: 'p1', name: 'Alice', avatar_url: 'https://example.com/alice.jpg' }]
    const matches = [match('m1', '2024-01-01T10:00:00Z')]
    const results = [res('p1', 'm1', 10)]
    const histories = computeSessionRankingHistory(matches, results, playersWithAvatar)
    expect(histories[0].name).toBe('Alice')
    expect(histories[0].avatarUrl).toBe('https://example.com/alice.jpg')
  })
})
