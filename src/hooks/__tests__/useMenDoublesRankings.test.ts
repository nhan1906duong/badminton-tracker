import { describe, expect, it } from 'vitest'
import { computeMenDoublesRankings } from '../useMenDoublesRankings'
import type { MatchWithDetails, Session } from '../../types/database'

function session(id: string, ended = true): Session {
  return {
    id,
    type: 'regular',
    started_at: '2026-01-01T10:00:00Z',
    ended_at: ended ? '2026-01-01T12:00:00Z' : null,
    created_by: 'u1',
    created_at: '2026-01-01T10:00:00Z',
    bwf_tournament_id: null,
  }
}

function player(id: string) {
  return { id, name: id, avatar_url: null, rating: 1000, created_at: '', created_by: 'u1' }
}

function mdMatch(
  id: string,
  sessionId: string,
  teamA: [string, string],
  teamB: [string, string],
  winner: 'A' | 'B' | null,
  type: MatchWithDetails['match_type'] = 'MEN_DOUBLES',
): MatchWithDetails {
  const makeParticipants = (players: string[], teamId: string) =>
    players.map((pid, i) => ({
      id: `part-${id}-${teamId}-${i}`,
      match_id: id,
      team_id: teamId,
      player_id: pid,
      player: player(pid),
    }))

  return {
    id,
    session_id: sessionId,
    match_type: type,
    played_at: '2026-01-01T10:00:00Z',
    status: 'COMPLETED',
    queue_position: null,
    created_by: 'u1',
    created_at: '2026-01-01T10:00:00Z',
    teams: [
      { id: 'ta', match_id: id, team_label: 'TEAM_A', is_winner: winner === 'A' },
      { id: 'tb', match_id: id, team_label: 'TEAM_B', is_winner: winner === 'B' },
    ],
    participants: [
      ...makeParticipants(teamA, 'ta'),
      ...makeParticipants(teamB, 'tb'),
    ],
    scores: [],
  }
}

describe('computeMenDoublesRankings', () => {
  it('aggregates wins and losses per pair', () => {
    const sessions = [session('s1')]
    const matches = [
      mdMatch('m1', 's1', ['p1', 'p2'], ['p3', 'p4'], 'A'),
      mdMatch('m2', 's1', ['p1', 'p2'], ['p3', 'p4'], 'B'),
      mdMatch('m3', 's1', ['p1', 'p2'], ['p3', 'p4'], 'A'),
    ]
    const rankings = computeMenDoublesRankings(matches, sessions)
    const pair12 = rankings.find((r) => r.key === 'p1:p2')
    const pair34 = rankings.find((r) => r.key === 'p3:p4')
    expect(pair12?.wins).toBe(2)
    expect(pair12?.losses).toBe(1)
    expect(pair12?.matchesPlayed).toBe(3)
    expect(pair34?.wins).toBe(1)
    expect(pair34?.losses).toBe(2)
  })

  it('sorts by win rate descending', () => {
    const sessions = [session('s1')]
    const matches = [
      mdMatch('m1', 's1', ['p1', 'p2'], ['p3', 'p4'], 'B'), // p1/p2: 0/1
      mdMatch('m2', 's1', ['p3', 'p4'], ['p5', 'p6'], 'A'), // p3/p4: 1/0
    ]
    const rankings = computeMenDoublesRankings(matches, sessions)
    expect(rankings[0].key).toBe('p3:p4')
    expect(rankings[1].key).toBe('p1:p2')
  })

  it('uses total wins as tiebreaker when win rates are equal', () => {
    // p1/p2: 1W 1L vs p5/p6 → 50% win rate, 1 win
    // p3/p4: 2W 2L vs p7/p8 → 50% win rate, 2 wins
    // p3/p4 should rank above p1/p2 on the wins tiebreaker
    const sessions = [session('s1')]
    const matches = [
      mdMatch('m1', 's1', ['p1', 'p2'], ['p5', 'p6'], 'A'),
      mdMatch('m2', 's1', ['p1', 'p2'], ['p5', 'p6'], 'B'),
      mdMatch('m3', 's1', ['p3', 'p4'], ['p7', 'p8'], 'A'),
      mdMatch('m4', 's1', ['p3', 'p4'], ['p7', 'p8'], 'A'),
      mdMatch('m5', 's1', ['p3', 'p4'], ['p7', 'p8'], 'B'),
      mdMatch('m6', 's1', ['p3', 'p4'], ['p7', 'p8'], 'B'),
    ]
    const rankings = computeMenDoublesRankings(matches, sessions)
    const pos12 = rankings.findIndex((r) => r.key === 'p1:p2')
    const pos34 = rankings.findIndex((r) => r.key === 'p3:p4')
    expect(pos34).toBeLessThan(pos12)
  })

  it('excludes matches from live (non-ended) sessions', () => {
    const sessions = [session('s1', true), session('s2', false)]
    const matches = [
      mdMatch('m1', 's1', ['p1', 'p2'], ['p3', 'p4'], 'A'),
      mdMatch('m2', 's2', ['p1', 'p2'], ['p3', 'p4'], 'A'), // live session — excluded
    ]
    const rankings = computeMenDoublesRankings(matches, sessions)
    const pair = rankings.find((r) => r.key === 'p1:p2')
    expect(pair?.matchesPlayed).toBe(1)
  })

  it('excludes non-MEN_DOUBLES matches', () => {
    const sessions = [session('s1')]
    const matches = [
      mdMatch('m1', 's1', ['p1', 'p2'], ['p3', 'p4'], 'A', 'MIXED_DOUBLES'),
    ]
    const rankings = computeMenDoublesRankings(matches, sessions)
    expect(rankings).toHaveLength(0)
  })

  it('excludes completed matches with no winner', () => {
    const sessions = [session('s1')]
    const matches = [
      mdMatch('m1', 's1', ['p1', 'p2'], ['p3', 'p4'], null),
    ]
    const rankings = computeMenDoublesRankings(matches, sessions)
    expect(rankings).toHaveLength(0)
  })
})
