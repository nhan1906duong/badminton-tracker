import { useMemo } from 'react'
import { useLeagueTeams } from './useLeagueTeams'
import { useMatches } from './useMatches'
import type { TeamStanding } from '../types/database'

export function useLeagueStandings(sessionId: string | undefined): TeamStanding[] | null {
  const { data: teams } = useLeagueTeams(sessionId)
  const { data: matches } = useMatches(sessionId)

  return useMemo(() => {
    if (!teams || teams.length === 0) return null

    // Build player → team map
    const playerToTeam = new Map<string, string>()
    for (const team of teams) {
      for (const player of team.players) {
        playerToTeam.set(player.id, team.id)
      }
    }

    // Initialize standings
    const standings = new Map<string, TeamStanding>()
    for (const team of teams) {
      standings.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        played: 0,
        wins: 0,
        losses: 0,
        points: 0,
      })
    }

    // Process completed matches with winners
    for (const match of matches ?? []) {
      if (match.status !== 'COMPLETED') continue

      const winnerTeam = match.teams.find((t) => t.is_winner)
      if (!winnerTeam) continue

      const loserTeam = match.teams.find((t) => !t.is_winner)
      if (!loserTeam) continue

      // Get players on each match team
      const winnerPlayerIds = match.participants
        .filter((p) => p.team_id === winnerTeam.id)
        .map((p) => p.player_id)

      const loserPlayerIds = match.participants
        .filter((p) => p.team_id === loserTeam.id)
        .map((p) => p.player_id)

      if (winnerPlayerIds.length === 0 || loserPlayerIds.length === 0) continue

      // Map match team to league team by majority of players
      function mapToLeagueTeam(playerIds: string[]): string | null {
        const counts = new Map<string, number>()
        for (const pid of playerIds) {
          const ltid = playerToTeam.get(pid)
          if (ltid) counts.set(ltid, (counts.get(ltid) ?? 0) + 1)
        }
        let bestId: string | null = null
        let bestCount = 0
        for (const [ltid, count] of counts) {
          if (count > bestCount) {
            bestCount = count
            bestId = ltid
          }
        }
        // Require at least half the players to belong to the same league team
        return bestCount >= playerIds.length / 2 ? bestId : null
      }

      const winnerLeagueTeamId = mapToLeagueTeam(winnerPlayerIds)
      const loserLeagueTeamId = mapToLeagueTeam(loserPlayerIds)

      if (!winnerLeagueTeamId || !loserLeagueTeamId) continue
      if (winnerLeagueTeamId === loserLeagueTeamId) continue

      const w = standings.get(winnerLeagueTeamId)
      const l = standings.get(loserLeagueTeamId)
      if (!w || !l) continue

      w.played++
      w.wins++
      w.points += 2

      l.played++
      l.losses++
    }

    // Sort by points DESC, then wins DESC, then played ASC (fewer games = better if tied)
    return Array.from(standings.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.wins !== a.wins) return b.wins - a.wins
      return a.played - b.played
    })
  }, [teams, matches])
}
