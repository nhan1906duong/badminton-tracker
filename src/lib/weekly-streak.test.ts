import { describe, expect, it } from 'vitest'
import {
  calculateCurrentTopOneWeekStreaks,
  type WeeklyStreakPlayer,
  type WeeklyStreakResult,
  type WeeklyStreakSession,
} from './weekly-streak'

const players: WeeklyStreakPlayer[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Carol' },
]

function session(id: string, startedAt: string, ended = true): WeeklyStreakSession {
  return {
    id,
    started_at: startedAt,
    ended_at: ended ? startedAt : null,
  }
}

function result(
  sessionId: string,
  matchId: string,
  playerId: string,
  points: number,
  options: Partial<Pick<WeeklyStreakResult, 'is_winner' | 'team_score' | 'opponent_score'>> = {}
): WeeklyStreakResult {
  return {
    session_id: sessionId,
    match_id: matchId,
    player_id: playerId,
    total_weekly_points: points,
    is_winner: options.is_winner ?? false,
    team_score: options.team_score ?? points,
    opponent_score: options.opponent_score ?? 0,
  }
}

describe('calculateCurrentTopOneWeekStreaks', () => {
  it('counts consecutive active weeks where the latest leader stays top 1', () => {
    const streaks = calculateCurrentTopOneWeekStreaks(
      [
        session('w1', '2026-05-04T12:00:00'),
        session('w2', '2026-05-11T12:00:00'),
        session('w3', '2026-05-18T12:00:00'),
      ],
      [
        result('w1', 'm1', 'p1', 20),
        result('w1', 'm2', 'p2', 10),
        result('w2', 'm3', 'p1', 20),
        result('w2', 'm4', 'p2', 10),
        result('w3', 'm5', 'p1', 20),
        result('w3', 'm6', 'p2', 10),
      ],
      players
    )

    expect(streaks.get('p1')).toBe(3)
    expect(streaks.get('p2')).toBe(0)
  })

  it('stops the current streak when the previous active week had another winner', () => {
    const streaks = calculateCurrentTopOneWeekStreaks(
      [
        session('w1', '2026-05-04T12:00:00'),
        session('w2', '2026-05-11T12:00:00'),
        session('w3', '2026-05-18T12:00:00'),
      ],
      [
        result('w1', 'm1', 'p1', 20),
        result('w2', 'm2', 'p2', 20),
        result('w3', 'm3', 'p1', 20),
      ],
      players
    )

    expect(streaks.get('p1')).toBe(1)
    expect(streaks.get('p2')).toBe(0)
  })

  it('aggregates multiple sessions in the same week by ranking points', () => {
    const streaks = calculateCurrentTopOneWeekStreaks(
      [
        session('s1', '2026-05-04T12:00:00'),
        session('s2', '2026-05-06T12:00:00'),
      ],
      [
        result('s1', 'm1', 'p1', 10),
        result('s2', 'm2', 'p1', 10),
        result('s1', 'm3', 'p2', 15),
      ],
      players
    )

    expect(streaks.get('p1')).toBe(1)
    expect(streaks.get('p2')).toBe(0)
  })

  it('uses wins, point difference, then name as tie-breakers', () => {
    const winTie = calculateCurrentTopOneWeekStreaks(
      [session('s1', '2026-05-04T12:00:00')],
      [
        result('s1', 'm1', 'p1', 20, { is_winner: false, team_score: 21, opponent_score: 10 }),
        result('s1', 'm2', 'p2', 20, { is_winner: true, team_score: 21, opponent_score: 10 }),
      ],
      players
    )
    expect(winTie.get('p2')).toBe(1)

    const diffTie = calculateCurrentTopOneWeekStreaks(
      [session('s1', '2026-05-04T12:00:00')],
      [
        result('s1', 'm1', 'p1', 20, { is_winner: true, team_score: 21, opponent_score: 15 }),
        result('s1', 'm2', 'p2', 20, { is_winner: true, team_score: 21, opponent_score: 10 }),
      ],
      players
    )
    expect(diffTie.get('p2')).toBe(1)

    const nameTie = calculateCurrentTopOneWeekStreaks(
      [session('s1', '2026-05-04T12:00:00')],
      [
        result('s1', 'm1', 'p1', 20, { is_winner: true, team_score: 21, opponent_score: 10 }),
        result('s1', 'm2', 'p2', 20, { is_winner: true, team_score: 21, opponent_score: 10 }),
      ],
      players
    )
    expect(nameTie.get('p1')).toBe(1)
  })

  it('ignores empty calendar weeks', () => {
    const streaks = calculateCurrentTopOneWeekStreaks(
      [
        session('w1', '2026-05-04T12:00:00'),
        session('w3', '2026-05-18T12:00:00'),
      ],
      [
        result('w1', 'm1', 'p1', 20),
        result('w3', 'm2', 'p1', 20),
      ],
      players
    )

    expect(streaks.get('p1')).toBe(2)
  })

  it('returns zero streaks when there are no ended sessions', () => {
    const streaks = calculateCurrentTopOneWeekStreaks(
      [session('s1', '2026-05-04T12:00:00', false)],
      [result('s1', 'm1', 'p1', 20)],
      players
    )

    expect(streaks.get('p1')).toBe(0)
    expect(streaks.get('p2')).toBe(0)
  })

  it('de-duplicates duplicate result rows by player and match', () => {
    const duplicate = result('s1', 'm1', 'p1', 20)
    const streaks = calculateCurrentTopOneWeekStreaks(
      [session('s1', '2026-05-04T12:00:00')],
      [
        duplicate,
        duplicate,
        result('s1', 'm2', 'p2', 30),
      ],
      players
    )

    expect(streaks.get('p1')).toBe(0)
    expect(streaks.get('p2')).toBe(1)
  })
})
