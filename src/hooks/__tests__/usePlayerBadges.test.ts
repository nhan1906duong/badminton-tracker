import { describe, expect, it } from 'vitest'
import { computeBadges } from '../usePlayerBadges'
import type { MatchWithDetails, Session } from '../../types/database'

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

function match(
  id: string,
  sessionId: string,
  playedAt: string,
  participants: Array<{ playerId: string; teamId: string }>,
  winnerTeamId: string,
): MatchWithDetails {
  return {
    id,
    session_id: sessionId,
    match_type: 'MEN_DOUBLES',
    played_at: playedAt,
    status: 'COMPLETED',
    queue_position: null,
    created_by: 'u1',
    created_at: playedAt,
    teams: [
      { id: 'ta', match_id: id, team_label: 'TEAM_A', is_winner: winnerTeamId === 'ta' },
      { id: 'tb', match_id: id, team_label: 'TEAM_B', is_winner: winnerTeamId === 'tb' },
    ],
    participants: participants.map((p, i) => ({
      id: `part-${id}-${i}`,
      match_id: id,
      team_id: p.teamId,
      player_id: p.playerId,
      player: { id: p.playerId, name: p.playerId, avatar_url: null, rating: 1000, created_at: '', created_by: 'u1' },
    })),
    scores: [],
  }
}

describe('computeBadges — session champion uses weeklyPoints', () => {
  it('awards dynasty badge using weeklyPoints ranking, not match wins', () => {
    // p1: 1 win × 50 pts = 50 (session champion by weeklyPoints)
    // p2: 3 wins × 10 pts = 30 (would win under old wins-based logic)
    const sessions = [session('s1', '2026-01-01'), session('s2', '2026-02-01')]
    const matches = [
      match('m1', 's1', '2026-01-01T10:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p2', teamId: 'tb' }, { playerId: 'p4', teamId: 'tb' }], 'ta'),
      match('m2', 's2', '2026-02-01T10:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p2', teamId: 'tb' }, { playerId: 'p4', teamId: 'tb' }], 'ta'),
    ]
    const results = [
      result('s1', 'p1', 'm1', 50, true),
      result('s1', 'p2', 'm1', 10, false),
      result('s2', 'p1', 'm2', 50, true),
      result('s2', 'p2', 'm2', 10, false),
    ]
    const badges = computeBadges(matches, sessions, results, 'p1')
    const dynasty = badges.find((b) => b.category === 'dynasty')
    expect(dynasty).toBeDefined()
    expect(dynasty!.count).toBe(2)
  })

  it('awards world title only for BWF sessions using weeklyPoints', () => {
    const sessions = [
      session('s1', '2026-01-01', 'bwf-1'),
      session('s2', '2026-02-01'), // not BWF
    ]
    const matches = [
      match('m1', 's1', '2026-01-01T10:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p2', teamId: 'tb' }, { playerId: 'p4', teamId: 'tb' }], 'ta'),
      match('m2', 's2', '2026-02-01T10:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p2', teamId: 'tb' }, { playerId: 'p4', teamId: 'tb' }], 'ta'),
    ]
    const results = [
      result('s1', 'p1', 'm1', 40, true),
      result('s1', 'p2', 'm1', 10, false),
      result('s2', 'p1', 'm2', 40, true),
      result('s2', 'p2', 'm2', 10, false),
    ]
    const badges = computeBadges(matches, sessions, results, 'p1')
    const titles = badges.find((b) => b.category === 'titles')
    expect(titles).toBeDefined()
    expect(titles!.count).toBe(1) // only BWF session counts
  })

  it('dynasty streak resets when player does not win a session', () => {
    const sessions = [
      session('s1', '2026-01-01'),
      session('s2', '2026-02-01'),
      session('s3', '2026-03-01'),
    ]
    const matches = [
      match('m1', 's1', '2026-01-01T10:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p2', teamId: 'tb' }, { playerId: 'p4', teamId: 'tb' }], 'ta'),
      match('m2', 's2', '2026-02-01T10:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p2', teamId: 'tb' }, { playerId: 'p4', teamId: 'tb' }], 'tb'), // p2 wins s2
      match('m3', 's3', '2026-03-01T10:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p2', teamId: 'tb' }, { playerId: 'p4', teamId: 'tb' }], 'ta'),
    ]
    const results = [
      result('s1', 'p1', 'm1', 40, true),
      result('s1', 'p2', 'm1', 10, false),
      result('s2', 'p1', 'm2', 10, false),  // p1 loses s2
      result('s2', 'p2', 'm2', 40, true),
      result('s3', 'p1', 'm3', 40, true),
      result('s3', 'p2', 'm3', 10, false),
    ]
    const badges = computeBadges(matches, sessions, results, 'p1')
    const dynasty = badges.find((b) => b.category === 'dynasty')
    // p1 wins s1, loses s2, wins s3 — best streak is 1, not shown (requires > 1)
    expect(dynasty).toBeUndefined()
  })

  it('does not award dynasty when rank 1 is tied', () => {
    // p1 and p2 each win 1 separate match per session with identical stats → genuine tie
    const sessions = [session('s1', '2026-01-01'), session('s2', '2026-02-01')]
    const matches = [
      // s1: p1 wins m1, p2 wins m2
      match('m1', 's1', '2026-01-01T10:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p5', teamId: 'tb' }, { playerId: 'p6', teamId: 'tb' }], 'ta'),
      match('m2', 's1', '2026-01-01T11:00:00Z',
        [{ playerId: 'p2', teamId: 'ta' }, { playerId: 'p4', teamId: 'ta' },
         { playerId: 'p7', teamId: 'tb' }, { playerId: 'p8', teamId: 'tb' }], 'ta'),
      // s2: same
      match('m3', 's2', '2026-02-01T10:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p5', teamId: 'tb' }, { playerId: 'p6', teamId: 'tb' }], 'ta'),
      match('m4', 's2', '2026-02-01T11:00:00Z',
        [{ playerId: 'p2', teamId: 'ta' }, { playerId: 'p4', teamId: 'ta' },
         { playerId: 'p7', teamId: 'tb' }, { playerId: 'p8', teamId: 'tb' }], 'ta'),
    ]
    // p1 and p2 each: 1 win, 20 pts, same team/opp scores → identical ranking stats
    const results = [
      result('s1', 'p1', 'm1', 20, true, 21, 15),
      result('s1', 'p2', 'm2', 20, true, 21, 15),
      result('s2', 'p1', 'm3', 20, true, 21, 15),
      result('s2', 'p2', 'm4', 20, true, 21, 15),
    ]
    const badges = computeBadges(matches, sessions, results, 'p1')
    expect(badges.find((b) => b.category === 'dynasty')).toBeUndefined()
  })

  it('most-played badge awarded to player with most completed matches', () => {
    const sessions = [session('s1', '2026-01-01')]
    const matches = [
      match('m1', 's1', '2026-01-01T10:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p2', teamId: 'tb' }, { playerId: 'p4', teamId: 'tb' }], 'ta'),
      match('m2', 's1', '2026-01-01T11:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p2', teamId: 'tb' }, { playerId: 'p4', teamId: 'tb' }], 'ta'),
    ]
    const results = [
      result('s1', 'p1', 'm1', 20, true),
      result('s1', 'p2', 'm1', 10, false),
      result('s1', 'p1', 'm2', 20, true),
      result('s1', 'p2', 'm2', 10, false),
    ]
    const p1Badges = computeBadges(matches, sessions, results, 'p1')
    const p2Badges = computeBadges(matches, sessions, results, 'p2')
    // Both played 2 — both should get most-played (tied)
    expect(p1Badges.find((b) => b.category === 'played')).toBeDefined()
    expect(p2Badges.find((b) => b.category === 'played')).toBeDefined()
  })

  it('most-donated badge reflects total losses × 5000', () => {
    const sessions = [session('s1', '2026-01-01')]
    const matches = [
      match('m1', 's1', '2026-01-01T10:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p2', teamId: 'tb' }, { playerId: 'p4', teamId: 'tb' }], 'ta'),
      match('m2', 's1', '2026-01-01T11:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p2', teamId: 'tb' }, { playerId: 'p4', teamId: 'tb' }], 'ta'),
      match('m3', 's1', '2026-01-01T12:00:00Z',
        [{ playerId: 'p1', teamId: 'ta' }, { playerId: 'p3', teamId: 'ta' },
         { playerId: 'p2', teamId: 'tb' }, { playerId: 'p4', teamId: 'tb' }], 'ta'),
    ]
    const results = [
      result('s1', 'p1', 'm1', 20, true),
      result('s1', 'p2', 'm1', 10, false),
      result('s1', 'p1', 'm2', 20, true),
      result('s1', 'p2', 'm2', 10, false),
      result('s1', 'p1', 'm3', 20, true),
      result('s1', 'p2', 'm3', 10, false),
    ]
    const badges = computeBadges(matches, sessions, results, 'p2')
    const donated = badges.find((b) => b.category === 'donated')
    expect(donated).toBeDefined()
    expect(donated!.count).toBe(15000) // 3 losses × 5000
  })
})
