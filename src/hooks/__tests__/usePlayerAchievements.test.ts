import { describe, expect, it } from 'vitest'
import { computeAchievements } from '../usePlayerAchievements'
import type { Session } from '../../types/database'

function session(id: string, startedAt: string, bwfTournamentId?: string): Session {
  return {
    id,
    type: 'regular',
    started_at: startedAt,
    created_by: 'u1',
    created_at: startedAt,
    bwf_tournament_id: bwfTournamentId ?? null,
  }
}

function result(
  sessionId: string,
  playerId: string,
  matchId: string,
  weeklyPoints: number,
  isWinner = true,
  teamScore = 21,
  opponentScore = 15,
) {
  return {
    session_id: sessionId,
    match_id: matchId,
    player_id: playerId,
    is_winner: isWinner,
    team_score: teamScore,
    opponent_score: opponentScore,
    total_weekly_points: weeklyPoints,
    rating_delta: null,
  }
}

describe('computeAchievements', () => {
  it('awards win to player with highest weeklyPoints', () => {
    // p1: 2 wins × 20 pts = 40 total
    // p2: 2 wins × 14 pts = 28 total
    const sessions = [session('s1', '2026-01-01')]
    const results = [
      result('s1', 'p1', 'm1', 20),
      result('s1', 'p1', 'm2', 20),
      result('s1', 'p2', 'm1', 14, false),
      result('s1', 'p2', 'm2', 14, false),
    ]
    const achievements = computeAchievements(sessions, results, 'p1')
    expect(achievements).toHaveLength(1)
    expect(achievements[0].type).toBe('win')
    expect(achievements[0].wins).toBe(2)
    expect(achievements[0].matchesPlayed).toBe(2)
  })

  it('awards runner_up to player ranked 2nd by weeklyPoints', () => {
    // p1: 40 pts (rank 1), p2: 28 pts (rank 2), p3 asks for p2's achievement
    const sessions = [session('s1', '2026-01-01')]
    const results = [
      result('s1', 'p1', 'm1', 20),
      result('s1', 'p1', 'm2', 20),
      result('s1', 'p2', 'm1', 14, false),
      result('s1', 'p2', 'm2', 14, false),
      result('s1', 'p3', 'm3', 5, false),
    ]
    const achievements = computeAchievements(sessions, results, 'p2')
    expect(achievements).toHaveLength(1)
    expect(achievements[0].type).toBe('runner_up')
  })

  it('does not award win when rank 1 is tied on all meaningful criteria', () => {
    // p1 and p2 both have 28 pts, same avg, same wins, same point diff
    const sessions = [session('s1', '2026-01-01')]
    const results = [
      result('s1', 'p1', 'm1', 14, true, 21, 15),
      result('s1', 'p1', 'm2', 14, true, 21, 15),
      result('s1', 'p2', 'm3', 14, true, 21, 15),
      result('s1', 'p2', 'm4', 14, true, 21, 15),
    ]
    const achievements = computeAchievements(sessions, results, 'p1')
    expect(achievements).toHaveLength(0)
  })

  it('excludes players ranked 3rd or lower', () => {
    const sessions = [session('s1', '2026-01-01')]
    const results = [
      result('s1', 'p1', 'm1', 30),
      result('s1', 'p2', 'm2', 20),
      result('s1', 'p3', 'm3', 10, false),
    ]
    const achievements = computeAchievements(sessions, results, 'p3')
    expect(achievements).toHaveLength(0)
  })

  it('sorts achievements by session date descending', () => {
    const sessions = [
      session('s1', '2026-01-01'),
      session('s2', '2026-03-01'),
    ]
    // p1 wins both sessions
    const results = [
      result('s1', 'p1', 'm1', 30),
      result('s1', 'p2', 'm1', 10, false),
      result('s2', 'p1', 'm2', 30),
      result('s2', 'p2', 'm2', 10, false),
    ]
    const achievements = computeAchievements(sessions, results, 'p1')
    expect(achievements).toHaveLength(2)
    expect(achievements[0].session.id).toBe('s2') // newer first
    expect(achievements[1].session.id).toBe('s1')
  })

  it('returns empty when player is not in any session', () => {
    const sessions = [session('s1', '2026-01-01')]
    const results = [result('s1', 'p2', 'm1', 20)]
    expect(computeAchievements(sessions, results, 'p1')).toHaveLength(0)
  })

  it('ranks by weeklyPoints not match wins — player with more pts wins even with fewer wins', () => {
    // p1: 1 win × 50 pts = 50 total
    // p2: 3 wins × 10 pts = 30 total
    // Old logic (rank by wins) would pick p2; new logic picks p1
    const sessions = [session('s1', '2026-01-01')]
    const results = [
      result('s1', 'p1', 'm1', 50, true),
      result('s1', 'p2', 'm2', 10, true),
      result('s1', 'p2', 'm3', 10, true),
      result('s1', 'p2', 'm4', 10, true),
    ]
    const p1achievements = computeAchievements(sessions, results, 'p1')
    const p2achievements = computeAchievements(sessions, results, 'p2')
    expect(p1achievements[0].type).toBe('win')
    expect(p2achievements[0].type).toBe('runner_up')
  })
})
