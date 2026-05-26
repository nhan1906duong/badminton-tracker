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

type GenerateMatchInput = {
  selectedPlayers: ShufflePlayer[]
  stats: Map<string, PlayerStats>
  partnerCount: Map<string, number>
  opponentCount: Map<string, number>
}

export function pairKey(a: ShufflePlayer, b: ShufflePlayer): string {
  return [a.id, b.id].sort().join('-')
}

function getCount(map: Map<string, number>, key: string): number {
  return map.get(key) ?? 0
}

function addCount(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1)
}

function calculateSplitScore(
  team1: [ShufflePlayer, ShufflePlayer],
  team2: [ShufflePlayer, ShufflePlayer],
  partnerCount: Map<string, number>,
  opponentCount: Map<string, number>
): number {
  const [a, b] = team1
  const [c, d] = team2

  let score = 0
  score += getCount(partnerCount, pairKey(a, b)) * 5
  score += getCount(partnerCount, pairKey(c, d)) * 5
  score += getCount(opponentCount, pairKey(a, c))
  score += getCount(opponentCount, pairKey(a, d))
  score += getCount(opponentCount, pairKey(b, c))
  score += getCount(opponentCount, pairKey(b, d))
  score += Math.random() * 2

  return score
}

export function generateNextMatch(input: GenerateMatchInput): ShuffleMatch {
  const { selectedPlayers, stats, partnerCount, opponentCount } = input

  if (selectedPlayers.length < 4) {
    throw new Error("Please select at least 4 players to generate a men's doubles match.")
  }

  const ranked = [...selectedPlayers]
    .map((player) => {
      const s = stats.get(player.id) ?? { played: 0, rested: 0, consecutivePlayed: 0 }
      const priority = s.rested * 3 - s.played * 2 - s.consecutivePlayed * 2 + Math.random()
      return { player, priority }
    })
    .sort((a, b) => b.priority - a.priority)

  const playing = ranked.slice(0, 4).map((x) => x.player)
  const playingIds = new Set(playing.map((p) => p.id))
  const resting = selectedPlayers.filter((p) => !playingIds.has(p.id))

  const [a, b, c, d] = playing

  const splits = [
    {
      team1: [a, b] as [ShufflePlayer, ShufflePlayer],
      team2: [c, d] as [ShufflePlayer, ShufflePlayer],
    },
    {
      team1: [a, c] as [ShufflePlayer, ShufflePlayer],
      team2: [b, d] as [ShufflePlayer, ShufflePlayer],
    },
    {
      team1: [a, d] as [ShufflePlayer, ShufflePlayer],
      team2: [b, c] as [ShufflePlayer, ShufflePlayer],
    },
  ].map((split) => ({
    ...split,
    score: calculateSplitScore(split.team1, split.team2, partnerCount, opponentCount),
  }))

  splits.sort((x, y) => x.score - y.score)

  return { team1: splits[0].team1, team2: splits[0].team2, resting }
}

export function applyMatchResult(
  match: ShuffleMatch,
  selectedPlayers: ShufflePlayer[],
  stats: Map<string, PlayerStats>,
  partnerCount: Map<string, number>,
  opponentCount: Map<string, number>
): void {
  const playingIds = new Set([
    match.team1[0].id,
    match.team1[1].id,
    match.team2[0].id,
    match.team2[1].id,
  ])

  for (const player of selectedPlayers) {
    const s = stats.get(player.id) ?? { played: 0, rested: 0, consecutivePlayed: 0 }
    if (playingIds.has(player.id)) {
      s.played += 1
      s.consecutivePlayed += 1
    } else {
      s.rested += 1
      s.consecutivePlayed = 0
    }
    stats.set(player.id, s)
  }

  const [a, b] = match.team1
  const [c, d] = match.team2

  addCount(partnerCount, pairKey(a, b))
  addCount(partnerCount, pairKey(c, d))
  addCount(opponentCount, pairKey(a, c))
  addCount(opponentCount, pairKey(a, d))
  addCount(opponentCount, pairKey(b, c))
  addCount(opponentCount, pairKey(b, d))
}

export function generateMatchSchedule(
  selectedPlayers: ShufflePlayer[],
  totalMatches: number
): ShuffleMatch[] {
  const stats = new Map<string, PlayerStats>()
  const partnerCount = new Map<string, number>()
  const opponentCount = new Map<string, number>()
  const matches: ShuffleMatch[] = []

  for (let i = 0; i < totalMatches; i++) {
    const match = generateNextMatch({ selectedPlayers, stats, partnerCount, opponentCount })
    matches.push(match)
    applyMatchResult(match, selectedPlayers, stats, partnerCount, opponentCount)
  }

  return matches
}

export function computeSessionStats(
  selectedPlayers: ShufflePlayer[],
  matches: ShuffleMatch[]
): Map<string, PlayerStats> {
  const stats = new Map<string, PlayerStats>()
  const partnerCount = new Map<string, number>()
  const opponentCount = new Map<string, number>()

  for (const match of matches) {
    applyMatchResult(match, selectedPlayers, stats, partnerCount, opponentCount)
  }

  return stats
}
