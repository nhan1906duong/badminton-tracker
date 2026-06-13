import { describe, expect, it } from 'vitest'
import { getMatchRow } from './player-match-row'
import type { MatchWithDetails, Player } from '../types/database'

function player(id: string, name: string): Player {
  return { id, name, rating: 1500, created_at: '2026-01-01', created_by: 'u1' }
}

function doublesMatch(overrides: Partial<MatchWithDetails> = {}): MatchWithDetails {
  return {
    id: 'm1',
    session_id: 's1',
    match_type: 'MEN_DOUBLES',
    played_at: '2026-01-01',
    status: 'COMPLETED',
    queue_position: null,
    created_by: 'u1',
    created_at: '2026-01-01',
    teams: [
      { id: 'tA', match_id: 'm1', team_label: 'TEAM_A', is_winner: true },
      { id: 'tB', match_id: 'm1', team_label: 'TEAM_B', is_winner: false },
    ],
    participants: [
      { id: 'p1', match_id: 'm1', team_id: 'tA', player_id: 'p1', player: player('p1', 'Danh Nguyen') },
      { id: 'p2', match_id: 'm1', team_id: 'tA', player_id: 'p2', player: player('p2', 'An Tran') },
      { id: 'p3', match_id: 'm1', team_id: 'tB', player_id: 'p3', player: player('p3', 'Binh Le') },
      { id: 'p4', match_id: 'm1', team_id: 'tB', player_id: 'p4', player: player('p4', 'Cuong Pham') },
    ],
    scores: [{ id: 'sc1', match_id: 'm1', set_number: 1, team_a_score: 21, team_b_score: 15 }],
    ...overrides,
  }
}

describe('getMatchRow', () => {
  it('returns win details with teammates and opponents from the player perspective', () => {
    const row = getMatchRow(doublesMatch(), 'p1')
    expect(row).toEqual({
      isWin: true,
      teammates: 'An T.',
      opponents: 'Binh L. & Cuong P.',
      scoreStr: '21–15',
      type: 'MD',
    })
  })

  it('flips score and win status for the losing team', () => {
    const row = getMatchRow(doublesMatch(), 'p3')
    expect(row?.isWin).toBe(false)
    expect(row?.teammates).toBe('Cuong P.')
    expect(row?.opponents).toBe('Danh N. & An T.')
    expect(row?.scoreStr).toBe('15–21')
  })

  it('returns null when the player did not participate in the match', () => {
    expect(getMatchRow(doublesMatch(), 'p5')).toBeNull()
  })

  it('returns null when the match has no winning team', () => {
    const match = doublesMatch({
      teams: [
        { id: 'tA', match_id: 'm1', team_label: 'TEAM_A', is_winner: false },
        { id: 'tB', match_id: 'm1', team_label: 'TEAM_B', is_winner: false },
      ],
    })
    expect(getMatchRow(match, 'p1')).toBeNull()
  })

  it('joins multi-set scores and formats singles matches with no teammates', () => {
    const match = doublesMatch({
      match_type: 'MEN_SINGLES',
      participants: [
        { id: 'p1', match_id: 'm1', team_id: 'tA', player_id: 'p1', player: player('p1', 'Danh') },
        { id: 'p3', match_id: 'm1', team_id: 'tB', player_id: 'p3', player: player('p3', 'Binh') },
      ],
      scores: [
        { id: 'sc1', match_id: 'm1', set_number: 1, team_a_score: 21, team_b_score: 15 },
        { id: 'sc2', match_id: 'm1', set_number: 2, team_a_score: 18, team_b_score: 21 },
      ],
    })
    const row = getMatchRow(match, 'p1')
    expect(row).toEqual({
      isWin: true,
      teammates: '',
      opponents: 'Binh',
      scoreStr: '21–15, 18–21',
      type: 'MS',
    })
  })
})
