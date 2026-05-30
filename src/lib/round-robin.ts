export interface RoundRobinFixture {
  round: number
  teamAIndex: number
  teamBIndex: number
}

/**
 * Generate a round-robin schedule where each round contains all unique pairings.
 * For N teams, each round has C(N,2) matches (every team plays every other team).
 * With `totalRounds` rounds, each pair plays `totalRounds` times.
 *
 * Returns fixtures sorted by round number. Each fixture uses 0-based team indices.
 */
export function generateRoundRobin(teamCount: number, totalRounds: number): RoundRobinFixture[] {
  if (teamCount < 2) return []

  const fixtures: RoundRobinFixture[] = []

  // Generate all unique pairings once
  const pairings: [number, number][] = []
  for (let i = 0; i < teamCount; i++) {
    for (let j = i + 1; j < teamCount; j++) {
      pairings.push([i, j])
    }
  }

  // Repeat all pairings for each round
  for (let round = 1; round <= totalRounds; round++) {
    for (const [a, b] of pairings) {
      fixtures.push({ round, teamAIndex: a, teamBIndex: b })
    }
  }

  // Sort by round, then by team indices for stable ordering
  return fixtures.sort((f1, f2) => {
    if (f1.round !== f2.round) return f1.round - f2.round
    if (f1.teamAIndex !== f2.teamAIndex) return f1.teamAIndex - f2.teamAIndex
    return f1.teamBIndex - f2.teamBIndex
  })
}

/**
 * Get the total number of rounds for a round-robin with given team count and cycles.
 */
export function getRoundRobinRoundCount(_teamCount: number, totalRounds: number): number {
  return totalRounds
}

/**
 * Get the total number of matches for a round-robin.
 */
export function getRoundRobinMatchCount(teamCount: number, totalRounds: number): number {
  if (teamCount < 2) return 0
  const pairs = (teamCount * (teamCount - 1)) / 2
  return pairs * totalRounds
}
