import { describe, expect, it } from 'vitest'
import type { MatchWithDetails } from '../../types/database'
import { computeBadges } from '../usePlayerBadges'

// ─── helpers ────────────────────────────────────────────────────────────────

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
      player: {
        id: p.playerId,
        name: p.playerId,
        avatar_url: null,
        rating: 1000,
        created_at: '',
        created_by: 'u1',
      },
    })),
    scores: [],
  }
}

function leaderRow(badge_type: string, leader_id: string, leader_count: number) {
  return { badge_type, leader_id, leader_count }
}

// ─── most-played badge ───────────────────────────────────────────────────────

describe('computeBadges — most-played', () => {
  const matches = [
    match(
      'm1',
      's1',
      '2026-01-01T10:00:00Z',
      [
        { playerId: 'p1', teamId: 'ta' },
        { playerId: 'p3', teamId: 'ta' },
        { playerId: 'p2', teamId: 'tb' },
        { playerId: 'p4', teamId: 'tb' },
      ],
      'ta',
    ),
    match(
      'm2',
      's1',
      '2026-01-01T11:00:00Z',
      [
        { playerId: 'p1', teamId: 'ta' },
        { playerId: 'p3', teamId: 'ta' },
        { playerId: 'p2', teamId: 'tb' },
        { playerId: 'p4', teamId: 'tb' },
      ],
      'ta',
    ),
  ]

  it('awards most-played badge when player matches the RPC leader_id', () => {
    const leaders = [leaderRow('most_played', 'p1', 2)]
    const badges = computeBadges(matches, leaders, 'p1')
    const played = badges.find(b => b.category === 'played')
    expect(played).toBeDefined()
    expect(played!.count).toBe(2)
  })

  it('awards most-played to both players when tied (RPC returns two rows)', () => {
    // RPC emits one row per tied leader
    const leaders = [leaderRow('most_played', 'p1', 2), leaderRow('most_played', 'p2', 2)]
    const p1Badges = computeBadges(matches, leaders, 'p1')
    const p2Badges = computeBadges(matches, leaders, 'p2')
    expect(p1Badges.find(b => b.category === 'played')).toBeDefined()
    expect(p2Badges.find(b => b.category === 'played')).toBeDefined()
  })

  it('does not award most-played when player is not the leader', () => {
    const leaders = [leaderRow('most_played', 'p1', 2)]
    const badges = computeBadges(matches, leaders, 'p2')
    expect(badges.find(b => b.category === 'played')).toBeUndefined()
  })
})

// ─── most-donated badge ──────────────────────────────────────────────────────

describe('computeBadges — most-donated', () => {
  it('count equals the raw loss count (× 5000 is a UI concern)', () => {
    const matches = [
      match(
        'm1',
        's1',
        '2026-01-01T10:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
      match(
        'm2',
        's1',
        '2026-01-01T11:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
      match(
        'm3',
        's1',
        '2026-01-01T12:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
    ]
    // p2 lost all 3 — RPC declares it the most-donated leader with count 3
    const leaders = [leaderRow('most_donated', 'p2', 3)]
    const badges = computeBadges(matches, leaders, 'p2')
    const donated = badges.find(b => b.category === 'donated')
    expect(donated).toBeDefined()
    expect(donated!.count).toBe(3) // raw losses; multiply by 5000 in the UI
  })

  it('does not award most-donated when player is not the leader', () => {
    const matches = [
      match(
        'm1',
        's1',
        '2026-01-01T10:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
    ]
    const leaders = [leaderRow('most_donated', 'p2', 1)]
    const badges = computeBadges(matches, leaders, 'p1')
    expect(badges.find(b => b.category === 'donated')).toBeUndefined()
  })
})

// ─── streak badge ────────────────────────────────────────────────────────────

describe('computeBadges — streak', () => {
  it('awards streak badge when player has a win streak ≥ 3', () => {
    const matches = [
      match(
        'm1',
        's1',
        '2026-01-01T10:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
      match(
        'm2',
        's1',
        '2026-01-01T11:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
      match(
        'm3',
        's1',
        '2026-01-01T12:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
    ]
    const badges = computeBadges(matches, [], 'p1')
    const streak = badges.find(b => b.category === 'streak')
    expect(streak).toBeDefined()
    expect(streak!.count).toBe(3)
  })

  it('does not award streak badge for a streak of 2', () => {
    const matches = [
      match(
        'm1',
        's1',
        '2026-01-01T10:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
      match(
        'm2',
        's1',
        '2026-01-01T11:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
    ]
    const badges = computeBadges(matches, [], 'p1')
    expect(badges.find(b => b.category === 'streak')).toBeUndefined()
  })

  it('streak resets on a loss and only counts the best run', () => {
    // win, loss, win, win, win → best streak = 3
    const matches = [
      match(
        'm1',
        's1',
        '2026-01-01T09:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
      match(
        'm2',
        's1',
        '2026-01-01T10:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'tb',
      ), // loss
      match(
        'm3',
        's1',
        '2026-01-01T11:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
      match(
        'm4',
        's1',
        '2026-01-01T12:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
      match(
        'm5',
        's1',
        '2026-01-01T13:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
    ]
    const badges = computeBadges(matches, [], 'p1')
    const streak = badges.find(b => b.category === 'streak')
    expect(streak).toBeDefined()
    expect(streak!.count).toBe(3)
  })
})

// ─── deferred badges ─────────────────────────────────────────────────────────

describe('computeBadges — deferred badges (dynasty / titles)', () => {
  it('does not compute dynasty badge (deferred to Phase 4)', () => {
    const matches = [
      match(
        'm1',
        's1',
        '2026-01-01T10:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
    ]
    const badges = computeBadges(matches, [], 'p1')
    expect(badges.find(b => b.category === 'dynasty')).toBeUndefined()
  })

  it('does not compute titles badge (deferred to Phase 4)', () => {
    const matches = [
      match(
        'm1',
        's1',
        '2026-01-01T10:00:00Z',
        [
          { playerId: 'p1', teamId: 'ta' },
          { playerId: 'p3', teamId: 'ta' },
          { playerId: 'p2', teamId: 'tb' },
          { playerId: 'p4', teamId: 'tb' },
        ],
        'ta',
      ),
    ]
    const badges = computeBadges(matches, [], 'p1')
    expect(badges.find(b => b.category === 'titles')).toBeUndefined()
  })
})

// ─── empty / edge cases ──────────────────────────────────────────────────────

describe('computeBadges — edge cases', () => {
  it('returns empty array for empty player id', () => {
    expect(computeBadges([], [], '')).toEqual([])
  })

  it('returns empty array when no matches and no leader rows', () => {
    expect(computeBadges([], [], 'p1')).toEqual([])
  })

  it('ignores leader rows with zero count', () => {
    const leaders = [leaderRow('most_played', 'p1', 0)]
    const badges = computeBadges([], leaders, 'p1')
    expect(badges.find(b => b.category === 'played')).toBeUndefined()
  })
})
