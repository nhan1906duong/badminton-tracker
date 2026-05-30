import { describe, expect, it } from 'vitest'
import {
  calculateScoreDifferenceBonus,
  calculateCloseGameBonus,
  calculateMatchPoints,
  calculateExpectedWinRate,
  calculateRatingDelta,
  teamAvgRating,
} from './rating'

describe('calculateScoreDifferenceBonus', () => {
  it('returns +1 for margins 1–4', () => {
    expect(calculateScoreDifferenceBonus(22, 21)).toBe(1) // diff 1
    expect(calculateScoreDifferenceBonus(21, 18)).toBe(1) // diff 3
    expect(calculateScoreDifferenceBonus(21, 17)).toBe(1) // diff 4
  })

  it('returns +2 for margins 5–10', () => {
    expect(calculateScoreDifferenceBonus(21, 16)).toBe(2) // diff 5
    expect(calculateScoreDifferenceBonus(21, 11)).toBe(2) // diff 10
  })

  it('returns +3 for margins 11–16', () => {
    expect(calculateScoreDifferenceBonus(21, 10)).toBe(3) // diff 11
    expect(calculateScoreDifferenceBonus(21, 5)).toBe(3)  // diff 16
  })

  it('returns +4 for margins 17+', () => {
    expect(calculateScoreDifferenceBonus(21, 4)).toBe(4)  // diff 17
    expect(calculateScoreDifferenceBonus(21, 0)).toBe(4)  // diff 21
  })
})

describe('calculateCloseGameBonus', () => {
  it('returns +3 for loser score 19+', () => {
    expect(calculateCloseGameBonus(19)).toBe(3)
    expect(calculateCloseGameBonus(20)).toBe(3)
    expect(calculateCloseGameBonus(21)).toBe(3)
  })

  it('returns +2 for loser score 16–18', () => {
    expect(calculateCloseGameBonus(16)).toBe(2)
    expect(calculateCloseGameBonus(17)).toBe(2)
    expect(calculateCloseGameBonus(18)).toBe(2)
  })

  it('returns +1 for loser score 13–15', () => {
    expect(calculateCloseGameBonus(13)).toBe(1)
    expect(calculateCloseGameBonus(14)).toBe(1)
    expect(calculateCloseGameBonus(15)).toBe(1)
  })

  it('returns 0 for loser score 0–12', () => {
    expect(calculateCloseGameBonus(0)).toBe(0)
    expect(calculateCloseGameBonus(12)).toBe(0)
  })
})

describe('calculateMatchPoints — winner', () => {
  it('minimum winner: beat much weaker team in close game', () => {
    const result = calculateMatchPoints({
      isWinner: true,
      teamScore: 21,
      opponentScore: 20,
      teamRating: 1200,
      opponentTeamRating: 900, // gap = -300, much weaker → strength bonus 0
    })
    expect(result.basePoints).toBe(10)
    expect(result.attendancePoints).toBe(1)
    expect(result.scoreBonus).toBe(1)   // diff 1 → tier ≤4
    expect(result.strengthBonus).toBe(0)
    expect(result.total).toBe(12)
  })

  it('maximum winner: upset blowout against extremely stronger team', () => {
    const result = calculateMatchPoints({
      isWinner: true,
      teamScore: 21,
      opponentScore: 0,
      teamRating: 800,
      opponentTeamRating: 1300, // gap = 500 → +6
    })
    expect(result.scoreBonus).toBe(4)   // diff 21 → tier 17+
    expect(result.strengthBonus).toBe(6)
    expect(result.total).toBe(21)
  })

  it('beat similar-rated team with mid margin', () => {
    const result = calculateMatchPoints({
      isWinner: true,
      teamScore: 21,
      opponentScore: 14,  // diff 7 → tier 5–10 → +2
      teamRating: 1000,
      opponentTeamRating: 1050, // gap 50 → +1
    })
    expect(result.scoreBonus).toBe(2)
    expect(result.strengthBonus).toBe(1)
    expect(result.total).toBe(14)
  })
})

describe('calculateMatchPoints — loser', () => {
  it('maximum loser: close loss with no strength penalty', () => {
    const result = calculateMatchPoints({
      isWinner: false,
      teamScore: 20,
      opponentScore: 21,
      teamRating: 1100,
      opponentTeamRating: 1100, // gap 0 → no penalty
    })
    expect(result.basePoints).toBe(3)
    expect(result.attendancePoints).toBe(1)
    expect(result.scoreBonus).toBe(3)   // score 20 → tier 19+
    expect(result.strengthBonus).toBe(0)
    expect(result.total).toBe(7)
  })

  it('strong team loses to weaker team (gap 101–250) — penalty -2', () => {
    const result = calculateMatchPoints({
      isWinner: false,
      teamScore: 10,
      opponentScore: 21,
      teamRating: 1200,
      opponentTeamRating: 1000, // loser gap = 200 > 100 → -2
    })
    expect(result.strengthBonus).toBe(-2)
    expect(result.total).toBe(2)  // 3+1+0-2 = 2
  })

  it('strong team loses to much weaker team (gap 251+) — penalty -3', () => {
    const result = calculateMatchPoints({
      isWinner: false,
      teamScore: 5,
      opponentScore: 21,
      teamRating: 1300,
      opponentTeamRating: 950, // loser gap = 350 > 250 → -3
    })
    expect(result.strengthBonus).toBe(-3)
    expect(result.total).toBe(1)  // 3+1+0-3 = 1 (at minimum floor)
  })

  it('loser with no penalty and mid score', () => {
    const result = calculateMatchPoints({
      isWinner: false,
      teamScore: 17,
      opponentScore: 21,
      teamRating: 1000,
      opponentTeamRating: 1100, // gap = -100, lost to stronger → no penalty
    })
    expect(result.scoreBonus).toBe(2)   // score 17 → tier 16–18
    expect(result.strengthBonus).toBe(0)
    expect(result.total).toBe(6)
  })
})

describe('calculateMatchPoints — minimum floor', () => {
  it('total is never below 1', () => {
    const result = calculateMatchPoints({
      isWinner: false,
      teamScore: 0,
      opponentScore: 21,
      teamRating: 1500,
      opponentTeamRating: 900, // loser gap 600 > 250 → -3
    })
    expect(result.total).toBe(1) // 3+1+0-3 = 1
  })
})

describe('teamAvgRating', () => {
  it('returns average of ratings', () => {
    expect(teamAvgRating([900, 1100])).toBe(1000)
    expect(teamAvgRating([1000])).toBe(1000)
  })

  it('returns initial rating for empty array', () => {
    expect(teamAvgRating([])).toBe(1000)
  })
})

describe('calculateExpectedWinRate', () => {
  it('returns 0.5 for equal teams', () => {
    expect(calculateExpectedWinRate(1000, 1000)).toBeCloseTo(0.5)
  })

  it('stronger team has higher expected win rate', () => {
    expect(calculateExpectedWinRate(1200, 1000)).toBeGreaterThan(0.5)
    expect(calculateExpectedWinRate(800, 1000)).toBeLessThan(0.5)
  })
})

describe('calculateRatingDelta', () => {
  it('win gives positive delta', () => {
    const expected = calculateExpectedWinRate(1000, 1000)
    expect(calculateRatingDelta(expected, 1)).toBeGreaterThan(0)
  })

  it('loss gives negative delta', () => {
    const expected = calculateExpectedWinRate(1000, 1000)
    expect(calculateRatingDelta(expected, 0)).toBeLessThan(0)
  })

  it('upset win gives larger delta than expected win', () => {
    const expectedWeak = calculateExpectedWinRate(800, 1200)  // underdog
    const expectedStrong = calculateExpectedWinRate(1200, 800) // favourite
    expect(calculateRatingDelta(expectedWeak, 1)).toBeGreaterThan(calculateRatingDelta(expectedStrong, 1))
  })
})
