import type { MatchType, SetScore } from '../types/database'

export function getRequiredPlayerCount(type: MatchType): number {
  return type === 'MEN_SINGLES' || type === 'WOMEN_SINGLES' ? 2 : 4
}

export function getTeamSize(type: MatchType): number {
  return type === 'MEN_SINGLES' || type === 'WOMEN_SINGLES' ? 1 : 2
}

/**
 * Calculate winner from set scores.
 * Returns 'TEAM_A' | 'TEAM_B' | null if tied or incomplete.
 */
export function calculateWinnerFromScores(scores: SetScore[]): 'TEAM_A' | 'TEAM_B' | null {
  if (scores.length === 0) return null

  let teamAWins = 0
  let teamBWins = 0

  for (const s of scores) {
    if (s.team_a_score > s.team_b_score) teamAWins++
    else if (s.team_b_score > s.team_a_score) teamBWins++
  }

  const setsNeeded = scores.length <= 3 ? 2 : 3
  if (teamAWins >= setsNeeded) return 'TEAM_A'
  if (teamBWins >= setsNeeded) return 'TEAM_B'
  return null
}

/**
 * Validate that a set score is valid (non-negative, one side wins by proper rules)
 */
export function isValidSetScore(a: number, b: number): boolean {
  if (a < 0 || b < 0) return false
  if (a === b) return false
  const winner = a > b ? a : b
  const loser = a > b ? b : a
  if (winner < 21) return false
  if (winner === 21 && loser >= 20) return false // must win by 2 if 20-20
  if (winner > 21 && winner - loser !== 2) return false // deuce: win by exactly 2
  return true
}

export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
