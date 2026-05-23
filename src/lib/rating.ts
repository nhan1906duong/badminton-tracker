export const SCORING_CONFIG = {
  initialRating: 1000,
  kFactor: 32,
  winBasePoints: 10,
  lossBasePoints: 3,
  attendancePoints: 1,
  minMatchPoints: 1,
} as const

export function teamAvgRating(ratings: number[]): number {
  if (ratings.length === 0) return SCORING_CONFIG.initialRating
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length
}

// Winner score difference bonus
export function calculateScoreDifferenceBonus(winnerScore: number, loserScore: number): number {
  const diff = winnerScore - loserScore
  if (diff <= 3) return 1
  if (diff <= 7) return 2
  if (diff <= 15) return 3
  return 4
}

// Loser consolation bonus for fighting close
export function calculateCloseGameBonus(loserScore: number): number {
  if (loserScore >= 20) return 3
  if (loserScore >= 18) return 2
  if (loserScore >= 15) return 1
  return 0
}

// Positive gap = winner beat a stronger team (upset bonus)
function winnerStrengthBonus(winnerTeamRating: number, opponentTeamRating: number): number {
  const gap = opponentTeamRating - winnerTeamRating
  if (gap < -100) return 0  // beat much weaker
  if (gap <= 100) return 1  // beat similar
  if (gap <= 250) return 2  // beat stronger
  if (gap <= 400) return 4  // beat much stronger
  return 6                  // beat extremely stronger
}

// Positive gap = loser was stronger than winner = lost to a weaker team = penalty
function loserStrengthAdjustment(loserTeamRating: number, winnerTeamRating: number): number {
  const gap = loserTeamRating - winnerTeamRating
  if (gap > 250) return -2  // lost to much weaker
  if (gap > 100) return -1  // lost to weaker
  return 0                  // lost to similar or stronger (no penalty)
}

export interface MatchPointsInput {
  isWinner: boolean
  teamScore: number        // this player's team's final score
  opponentScore: number    // opposing team's final score
  teamRating: number       // this player's team avg rating
  opponentTeamRating: number
}

export interface MatchPointsBreakdown {
  basePoints: number
  attendancePoints: number
  scoreBonus: number
  strengthBonus: number
  total: number
}

export function calculateMatchPoints(input: MatchPointsInput): MatchPointsBreakdown {
  const { isWinner, teamScore, opponentScore, teamRating, opponentTeamRating } = input

  const basePoints = isWinner ? SCORING_CONFIG.winBasePoints : SCORING_CONFIG.lossBasePoints
  const attendancePoints = SCORING_CONFIG.attendancePoints

  const scoreBonus = isWinner
    ? calculateScoreDifferenceBonus(teamScore, opponentScore)
    : calculateCloseGameBonus(teamScore)

  const strengthBonus = isWinner
    ? winnerStrengthBonus(teamRating, opponentTeamRating)
    : loserStrengthAdjustment(teamRating, opponentTeamRating)

  const total = Math.max(
    SCORING_CONFIG.minMatchPoints,
    basePoints + attendancePoints + scoreBonus + strengthBonus
  )

  return { basePoints, attendancePoints, scoreBonus, strengthBonus, total }
}

// Elo expected win probability for a team
export function calculateExpectedWinRate(teamRating: number, opponentTeamRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentTeamRating - teamRating) / 400))
}

// Elo rating change for one player
export function calculateRatingDelta(
  expected: number,
  actual: 0 | 1,
  k = SCORING_CONFIG.kFactor
): number {
  return Math.round(k * (actual - expected))
}
