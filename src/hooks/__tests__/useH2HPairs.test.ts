import { describe, expect, it } from 'vitest'
import { computeH2HPairs } from '../useH2HPairs'
import type { MatchWithDetails } from '../../types/database'

function player(id: string) {
  return { id, name: id, avatar_url: null, rating: 1000, created_at: '', created_by: 'u1', nationality: null }
}

function makeMatch(
  id: string,
  teamA: string[],
  teamB: string[],
  winner: 'A' | 'B' | null,
  opts: { status?: MatchWithDetails['status']; playedAt?: string } = {},
): MatchWithDetails {
  const status = opts.status ?? (winner !== null ? 'COMPLETED' : 'LIVE')
  const playedAt = opts.playedAt ?? '2026-01-01T10:00:00Z'

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
    session_id: 's1',
    match_type: 'MEN_DOUBLES',
    played_at: playedAt,
    ended_at: null,
    notes: null,
    status,
    queue_position: null,
    league_round: null,
    created_by: 'u1',
    created_at: playedAt,
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

describe('computeH2HPairs', () => {
  it('returns empty result when no player IDs provided', () => {
    const match = makeMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 'A')
    expect(computeH2HPairs([match], [], ['p3', 'p4'])).toEqual({
      teamAWins: 0, teamBWins: 0, totalMatches: 0, matches: [],
    })
    expect(computeH2HPairs([match], ['p1', 'p2'], [])).toEqual({
      teamAWins: 0, teamBWins: 0, totalMatches: 0, matches: [],
    })
  })

  it('counts a win for teamA when teamA players are on TEAM_A side', () => {
    const match = makeMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 'A')
    const result = computeH2HPairs([match], ['p1', 'p2'], ['p3', 'p4'])
    expect(result.teamAWins).toBe(1)
    expect(result.teamBWins).toBe(0)
    expect(result.totalMatches).toBe(1)
  })

  it('counts a win for teamA when players are swapped (reversed orientation)', () => {
    // p1+p2 are on TEAM_B in this match but are still "teamA" from the caller's perspective
    const match = makeMatch('m1', ['p3', 'p4'], ['p1', 'p2'], 'B')
    const result = computeH2HPairs([match], ['p1', 'p2'], ['p3', 'p4'])
    expect(result.teamAWins).toBe(1)
    expect(result.teamBWins).toBe(0)
  })

  it('counts a win for teamB', () => {
    const match = makeMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 'B')
    const result = computeH2HPairs([match], ['p1', 'p2'], ['p3', 'p4'])
    expect(result.teamAWins).toBe(0)
    expect(result.teamBWins).toBe(1)
  })

  it('ignores matches that are not COMPLETED', () => {
    const match = makeMatch('m1', ['p1', 'p2'], ['p3', 'p4'], null, { status: 'LIVE' })
    const result = computeH2HPairs([match], ['p1', 'p2'], ['p3', 'p4'])
    expect(result.totalMatches).toBe(0)
  })

  it('ignores COMPLETED matches with no winner', () => {
    const match = makeMatch('m1', ['p1', 'p2'], ['p3', 'p4'], null, { status: 'COMPLETED' })
    const result = computeH2HPairs([match], ['p1', 'p2'], ['p3', 'p4'])
    expect(result.totalMatches).toBe(0)
  })

  it('ignores matches involving different players', () => {
    const match = makeMatch('m1', ['p1', 'p2'], ['p5', 'p6'], 'A')
    const result = computeH2HPairs([match], ['p1', 'p2'], ['p3', 'p4'])
    expect(result.totalMatches).toBe(0)
  })

  it('aggregates multiple matches correctly', () => {
    const matches = [
      makeMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 'A', { playedAt: '2026-01-03T10:00:00Z' }),
      makeMatch('m2', ['p1', 'p2'], ['p3', 'p4'], 'B', { playedAt: '2026-01-02T10:00:00Z' }),
      makeMatch('m3', ['p3', 'p4'], ['p1', 'p2'], 'A', { playedAt: '2026-01-01T10:00:00Z' }),
    ]
    const result = computeH2HPairs(matches, ['p1', 'p2'], ['p3', 'p4'])
    expect(result.totalMatches).toBe(3)
    expect(result.teamAWins).toBe(1)  // m1
    expect(result.teamBWins).toBe(2)  // m2 + m3 (reversed: p3+p4 win)
  })

  it('returns matches sorted newest first', () => {
    const matches = [
      makeMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 'A', { playedAt: '2026-01-01T10:00:00Z' }),
      makeMatch('m2', ['p1', 'p2'], ['p3', 'p4'], 'B', { playedAt: '2026-01-03T10:00:00Z' }),
    ]
    const result = computeH2HPairs(matches, ['p1', 'p2'], ['p3', 'p4'])
    expect(result.matches[0].id).toBe('m2')
    expect(result.matches[1].id).toBe('m1')
  })

  it('works for singles (1v1)', () => {
    const match = makeMatch('m1', ['p1'], ['p2'], 'A')
    const result = computeH2HPairs([match], ['p1'], ['p2'])
    expect(result.teamAWins).toBe(1)
    expect(result.totalMatches).toBe(1)
  })
})
