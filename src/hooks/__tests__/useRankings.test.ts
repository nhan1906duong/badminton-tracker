import { describe, expect, it } from 'vitest'
import { buildSessionWeeklyRankings } from '../useRankings'

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

describe('buildSessionWeeklyRankings — averageWeeklyPoints sort', () => {
  it('ranks by average pts per match, not raw total', () => {
    // Alice: 2 matches × 16 pts = 32 total, avg 16
    // Bob:   4 matches × 14 pts = 56 total, avg 14
    // Bob has higher raw total but Alice has better average
    const results = [
      result('p1', 'm1', true, 16),
      result('p1', 'm2', true, 16),
      result('p2', 'm3', true, 14),
      result('p2', 'm4', true, 14),
      result('p2', 'm5', true, 14),
      result('p2', 'm6', true, 14),
    ]
    const rankings = buildSessionWeeklyRankings(players, results)
    expect(rankings[0].playerId).toBe('p1')  // Alice wins on avg (16 > 14)
    expect(rankings[0].averageWeeklyPoints).toBe(16)
    expect(rankings[1].playerId).toBe('p2')
    expect(rankings[1].averageWeeklyPoints).toBe(14)
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
