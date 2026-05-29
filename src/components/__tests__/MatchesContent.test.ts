import { describe, it, expect } from 'vitest'
import { sortMatches } from '../MatchesContent'
import type { MatchWithDetails } from '../../types/database'

function makeMatch(overrides: Partial<MatchWithDetails>): MatchWithDetails {
  return {
    id: 'match-1',
    session_id: 'sess-1',
    match_type: 'MEN_DOUBLES',
    played_at: '2024-01-01T10:00:00Z',
    ended_at: null,
    notes: null,
    status: 'SCHEDULED',
    queue_position: null,
    created_by: 'user-1',
    created_at: '2024-01-01T10:00:00Z',
    teams: [],
    participants: [],
    scores: [],
    ...overrides,
  }
}

describe('sortMatches', () => {
  it('places LIVE before SCHEDULED before COMPLETED', () => {
    const completed = makeMatch({ id: 'c', status: 'COMPLETED', created_at: '2024-01-01T09:00:00Z' })
    const scheduled = makeMatch({ id: 's', status: 'SCHEDULED', queue_position: 1, created_at: '2024-01-01T09:00:00Z' })
    const live = makeMatch({ id: 'l', status: 'LIVE', created_at: '2024-01-01T09:00:00Z' })

    const result = sortMatches([completed, scheduled, live])
    expect(result.map((m) => m.id)).toEqual(['l', 's', 'c'])
  })

  it('sorts SCHEDULED matches by queue_position ascending', () => {
    const q3 = makeMatch({ id: 'q3', status: 'SCHEDULED', queue_position: 3 })
    const q1 = makeMatch({ id: 'q1', status: 'SCHEDULED', queue_position: 1 })
    const q2 = makeMatch({ id: 'q2', status: 'SCHEDULED', queue_position: 2 })

    const result = sortMatches([q3, q1, q2])
    expect(result.map((m) => m.id)).toEqual(['q1', 'q2', 'q3'])
  })

  it('puts SCHEDULED matches with null queue_position after those with a position', () => {
    const withPos = makeMatch({ id: 'wp', status: 'SCHEDULED', queue_position: 1 })
    const noPos = makeMatch({ id: 'np', status: 'SCHEDULED', queue_position: null })

    const result = sortMatches([noPos, withPos])
    expect(result.map((m) => m.id)).toEqual(['wp', 'np'])
  })

  it('sorts COMPLETED matches by ended_at descending (most recent first)', () => {
    const older = makeMatch({ id: 'old', status: 'COMPLETED', ended_at: '2024-01-01T10:00:00Z' })
    const newer = makeMatch({ id: 'new', status: 'COMPLETED', ended_at: '2024-01-01T11:00:00Z' })

    const result = sortMatches([older, newer])
    expect(result.map((m) => m.id)).toEqual(['new', 'old'])
  })

  it('falls back to created_at for COMPLETED matches without ended_at', () => {
    const a = makeMatch({ id: 'a', status: 'COMPLETED', ended_at: null, created_at: '2024-01-01T09:00:00Z' })
    const b = makeMatch({ id: 'b', status: 'COMPLETED', ended_at: null, created_at: '2024-01-01T10:00:00Z' })

    const result = sortMatches([a, b])
    expect(result.map((m) => m.id)).toEqual(['b', 'a'])
  })

  it('sorts LIVE matches by created_at ascending', () => {
    const first = makeMatch({ id: 'first', status: 'LIVE', created_at: '2024-01-01T09:00:00Z' })
    const second = makeMatch({ id: 'second', status: 'LIVE', created_at: '2024-01-01T10:00:00Z' })

    const result = sortMatches([second, first])
    expect(result.map((m) => m.id)).toEqual(['first', 'second'])
  })

  it('does not mutate the original array', () => {
    const matches = [
      makeMatch({ id: 'c', status: 'COMPLETED' }),
      makeMatch({ id: 'l', status: 'LIVE' }),
    ]
    const original = [...matches]
    sortMatches(matches)
    expect(matches.map((m) => m.id)).toEqual(original.map((m) => m.id))
  })

  it('handles an empty array', () => {
    expect(sortMatches([])).toEqual([])
  })
})
