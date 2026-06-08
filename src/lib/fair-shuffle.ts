export type ShufflePlayer = {
  id: string
  name: string
}

export type PlayerStats = {
  played: number
  rested: number
  consecutivePlayed: number
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
  // Splits already played in this session
  playedSplits: Set<string>
  // Last 2 played matches — used to detect recently repeated partners
  recentMatchHistory: ShuffleMatch[]
  // Key of the last suggested split — excluded from the chosen tier when alternatives exist
  lastPickKey?: string
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

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('+')
}

export function generateNextMatch(input: GenerateMatchInput): ShuffleMatch {
  const { selectedPlayers, playedSplits, recentMatchHistory, lastPickKey } = input

  if (selectedPlayers.length < 4) {
    throw new Error("Please select at least 4 players to generate a men's doubles match.")
  }

  const allSplits = enumerateSplits(selectedPlayers)

  // Collect all partner pairs that appeared together in the last 2 matches
  const recentPairKeys = new Set<string>()
  for (const recent of recentMatchHistory) {
    recentPairKeys.add(pairKey(recent.team1[0].id, recent.team1[1].id))
    recentPairKeys.add(pairKey(recent.team2[0].id, recent.team2[1].id))
  }

  // Tier 1: already played in this session
  // Tier 2: not played yet but a team pair was together in a recent match
  // Tier 3: fully fresh — never played in session and no recent partner repeat
  const tier1: CandidateSplit[] = []
  const tier2: CandidateSplit[] = []
  const tier3: CandidateSplit[] = []

  for (const split of allSplits) {
    if (playedSplits.has(split.key)) {
      tier1.push(split)
    } else {
      const hasRecentRepeat =
        recentPairKeys.has(pairKey(split.team1[0].id, split.team1[1].id)) ||
        recentPairKeys.has(pairKey(split.team2[0].id, split.team2[1].id))
      if (hasRecentRepeat) {
        tier2.push(split)
      } else {
        tier3.push(split)
      }
    }
  }

  // Pick randomly from the best available tier, excluding the last suggestion if alternatives exist
  const pool = tier3.length > 0 ? tier3 : tier2.length > 0 ? tier2 : tier1
  const candidates = lastPickKey && pool.length > 1 ? pool.filter(s => s.key !== lastPickKey) : pool
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  return { team1: pick.team1, team2: pick.team2, resting: pick.resting }
}

// Call after each match to advance state for the next shuffle
export function applyMatchResult(
  match: ShuffleMatch,
  playedSplits: Set<string>,
  recentMatchHistory: ShuffleMatch[],
): void {
  const key = makeSplitKey(
    [match.team1[0].id, match.team1[1].id],
    [match.team2[0].id, match.team2[1].id],
  )
  playedSplits.add(key)
  recentMatchHistory.push(match)
  if (recentMatchHistory.length > 2) recentMatchHistory.shift()
}

export function generateMatchSchedule(
  selectedPlayers: ShufflePlayer[],
  totalMatches: number,
): ShuffleMatch[] {
  const playedSplits = new Set<string>()
  const recentMatchHistory: ShuffleMatch[] = []
  const matches: ShuffleMatch[] = []

  for (let i = 0; i < totalMatches; i++) {
    const match = generateNextMatch({ selectedPlayers, playedSplits, recentMatchHistory })
    matches.push(match)
    applyMatchResult(match, playedSplits, recentMatchHistory)
  }

  return matches
}
