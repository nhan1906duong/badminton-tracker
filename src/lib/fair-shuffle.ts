export type ShufflePlayer = {
  id: string
  name: string
}

export type PlayerStats = {
  played: number
  rested: number
  consecutivePlayed: number
}

export type SplitRecord = {
  team1Wins: number
  team2Wins: number
}

export type ShuffleMatch = {
  team1: [ShufflePlayer, ShufflePlayer]
  team2: [ShufflePlayer, ShufflePlayer]
  resting: ShufflePlayer[]
}

type CandidateSplit = {
  key: string
  team1: [ShufflePlayer, ShufflePlayer]
  team2: [ShufflePlayer, ShufflePlayer]
  resting: ShufflePlayer[]
}

type GenerateMatchInput = {
  selectedPlayers: ShufflePlayer[]
  splitRecord: Map<string, SplitRecord>
  cycleUsedSplits: Set<string>
  playerWins: Map<string, number>
  playerPlayed: Map<string, number>
}

// Canonical key for a team split — order of teams and players within teams doesn't matter
export function makeSplitKey(team1Ids: readonly string[], team2Ids: readonly string[]): string {
  const t1 = [...team1Ids].sort().join('+')
  const t2 = [...team2Ids].sort().join('+')
  return [t1, t2].sort().join('|')
}

// All possible doubles splits from a pool: C(n,4) subsets × 3 ways to pair them
export function enumerateSplits(players: ShufflePlayer[]): CandidateSplit[] {
  const n = players.length
  if (n < 4) return []

  const result: CandidateSplit[] = []

  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const [a, b, c, d] = [players[i], players[j], players[k], players[l]]
          const playing = new Set([i, j, k, l])
          const resting = players.filter((_, idx) => !playing.has(idx))

          for (const [t1, t2] of [
            [[a, b], [c, d]],
            [[a, c], [b, d]],
            [[a, d], [b, c]],
          ] as [[ShufflePlayer, ShufflePlayer], [ShufflePlayer, ShufflePlayer]][]) {
            result.push({
              key: makeSplitKey([t1[0].id, t1[1].id], [t2[0].id, t2[1].id]),
              team1: t1,
              team2: t2,
              resting,
            })
          }
        }
      }
    }
  }

  return result
}

export function generateNextMatch(input: GenerateMatchInput): ShuffleMatch {
  const { selectedPlayers, splitRecord, cycleUsedSplits, playerWins, playerPlayed } = input

  if (selectedPlayers.length < 4) {
    throw new Error("Please select at least 4 players to generate a men's doubles match.")
  }

  const allSplits = enumerateSplits(selectedPlayers)

  // Cycle: only use splits not yet played in this round; if all used, start a new round
  let candidates = allSplits.filter(s => !cycleUsedSplits.has(s.key))
  if (candidates.length === 0) candidates = allSplits

  // Rank by (ascending = better):
  // 1. win imbalance for this specific matchup (prefer balanced head-to-head)
  // 2. strength imbalance between teams (prefer evenly matched teams)
  // 3. rest fairness (prefer splits that let the most-played players rest)
  // 4. random tiebreaker
  const scored = candidates.map(s => {
    const rec = splitRecord.get(s.key) ?? { team1Wins: 0, team2Wins: 0 }
    const winImbalance = Math.abs(rec.team1Wins - rec.team2Wins)

    const t1Str = (playerWins.get(s.team1[0].id) ?? 0) + (playerWins.get(s.team1[1].id) ?? 0)
    const t2Str = (playerWins.get(s.team2[0].id) ?? 0) + (playerWins.get(s.team2[1].id) ?? 0)
    const strengthImbalance = Math.abs(t1Str - t2Str)

    // Higher totalRestingPlayed = resting players have played more = they deserve the rest
    const totalRestingPlayed = s.resting.reduce((sum, p) => sum + (playerPlayed.get(p.id) ?? 0), 0)

    return { ...s, winImbalance, strengthImbalance, totalRestingPlayed, rand: Math.random() }
  })

  scored.sort((a, b) =>
    a.winImbalance !== b.winImbalance ? a.winImbalance - b.winImbalance :
    a.strengthImbalance !== b.strengthImbalance ? a.strengthImbalance - b.strengthImbalance :
    b.totalRestingPlayed !== a.totalRestingPlayed ? b.totalRestingPlayed - a.totalRestingPlayed :
    a.rand - b.rand
  )

  const { team1, team2, resting } = scored[0]
  return { team1, team2, resting }
}

// Call after each match to advance state for the next shuffle
export function applyMatchResult(
  match: ShuffleMatch,
  winnerTeam: 'team1' | 'team2' | null,
  splitRecord: Map<string, SplitRecord>,
  cycleUsedSplits: Set<string>,
  totalPossibleSplits: number,
  playerWins: Map<string, number>,
  playerPlayed: Map<string, number>,
): void {
  const key = makeSplitKey(
    [match.team1[0].id, match.team1[1].id],
    [match.team2[0].id, match.team2[1].id],
  )

  cycleUsedSplits.add(key)
  if (cycleUsedSplits.size >= totalPossibleSplits) cycleUsedSplits.clear()

  for (const p of [...match.team1, ...match.team2]) {
    playerPlayed.set(p.id, (playerPlayed.get(p.id) ?? 0) + 1)
  }

  if (winnerTeam !== null) {
    const winners = winnerTeam === 'team1' ? match.team1 : match.team2
    for (const p of winners) {
      playerWins.set(p.id, (playerWins.get(p.id) ?? 0) + 1)
    }

    const t1Norm = [...match.team1.map(p => p.id)].sort().join('+')
    const t2Norm = [...match.team2.map(p => p.id)].sort().join('+')
    const [pair1] = [t1Norm, t2Norm].sort()
    const winnerNorm = winnerTeam === 'team1' ? t1Norm : t2Norm

    const rec = splitRecord.get(key) ?? { team1Wins: 0, team2Wins: 0 }
    if (winnerNorm === pair1) rec.team1Wins++
    else rec.team2Wins++
    splitRecord.set(key, rec)
  }
}

export function generateMatchSchedule(
  selectedPlayers: ShufflePlayer[],
  totalMatches: number,
): ShuffleMatch[] {
  const splitRecord = new Map<string, SplitRecord>()
  const cycleUsedSplits = new Set<string>()
  const playerWins = new Map<string, number>()
  const playerPlayed = new Map<string, number>()
  const totalPossibleSplits = enumerateSplits(selectedPlayers).length
  const matches: ShuffleMatch[] = []

  for (let i = 0; i < totalMatches; i++) {
    const match = generateNextMatch({ selectedPlayers, splitRecord, cycleUsedSplits, playerWins, playerPlayed })
    matches.push(match)
    applyMatchResult(match, null, splitRecord, cycleUsedSplits, totalPossibleSplits, playerWins, playerPlayed)
  }

  return matches
}
