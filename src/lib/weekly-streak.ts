export interface WeeklyStreakSession {
  id: string
  started_at: string
  ended_at: string | null
}

export interface WeeklyStreakPlayer {
  id: string
  name: string
}

export interface WeeklyStreakResult {
  session_id: string
  match_id: string
  player_id: string
  is_winner: boolean
  team_score: number
  opponent_score: number
  total_weekly_points: number
}

interface WeeklyPlayerStats {
  playerId: string
  name: string
  rankingPoints: number
  wins: number
  pointDifference: number
}

function localWeekKey(iso: string): string {
  const date = new Date(iso)
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = start.getDay()
  const daysSinceMonday = (day + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday)

  const year = start.getFullYear()
  const month = String(start.getMonth() + 1).padStart(2, '0')
  const dayOfMonth = String(start.getDate()).padStart(2, '0')
  return `${year}-${month}-${dayOfMonth}`
}

function uniquePlayerMatchResults<T extends { player_id: string; match_id: string }>(results: T[]): T[] {
  return Array.from(new Map(results.map(result => [`${result.player_id}:${result.match_id}`, result])).values())
}

function compareWeeklyStats(a: WeeklyPlayerStats, b: WeeklyPlayerStats): number {
  if (b.rankingPoints !== a.rankingPoints) return b.rankingPoints - a.rankingPoints
  if (b.wins !== a.wins) return b.wins - a.wins
  if (b.pointDifference !== a.pointDifference) return b.pointDifference - a.pointDifference
  return a.name.localeCompare(b.name)
}

export function calculateCurrentTopOneWeekStreaks(
  sessions: WeeklyStreakSession[] | null | undefined,
  results: WeeklyStreakResult[] | null | undefined,
  players: WeeklyStreakPlayer[] | null | undefined
): Map<string, number> {
  const streaks = new Map((players ?? []).map(player => [player.id, 0]))
  const playerMap = new Map((players ?? []).map(player => [player.id, player]))
  const endedSessionMap = new Map(
    (sessions ?? [])
      .filter(session => session.ended_at != null)
      .map(session => [session.id, session])
  )

  if (endedSessionMap.size === 0) return streaks

  const weeklyStats = new Map<string, Map<string, WeeklyPlayerStats>>()

  for (const result of uniquePlayerMatchResults(results ?? [])) {
    const session = endedSessionMap.get(result.session_id)
    if (!session) continue

    const weekKey = localWeekKey(session.started_at)
    const playerStats = weeklyStats.get(weekKey) ?? new Map<string, WeeklyPlayerStats>()
    const player = playerMap.get(result.player_id)
    const stats = playerStats.get(result.player_id) ?? {
      playerId: result.player_id,
      name: player?.name ?? '',
      rankingPoints: 0,
      wins: 0,
      pointDifference: 0,
    }

    stats.rankingPoints += result.total_weekly_points
    stats.wins += result.is_winner ? 1 : 0
    stats.pointDifference += result.team_score - result.opponent_score

    playerStats.set(result.player_id, stats)
    weeklyStats.set(weekKey, playerStats)
  }

  const weeklyWinners = Array.from(weeklyStats.entries())
    .map(([weekKey, playerStats]) => {
      const winner = Array.from(playerStats.values()).sort(compareWeeklyStats)[0]
      return winner ? { weekKey, playerId: winner.playerId } : null
    })
    .filter((winner): winner is { weekKey: string; playerId: string } => winner != null)
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey))

  if (weeklyWinners.length === 0) return streaks

  const currentLeaderId = weeklyWinners[0].playerId
  let currentStreak = 0
  for (const winner of weeklyWinners) {
    if (winner.playerId !== currentLeaderId) break
    currentStreak += 1
  }

  streaks.set(currentLeaderId, currentStreak)
  return streaks
}
