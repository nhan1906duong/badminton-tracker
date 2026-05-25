import { useMemo } from 'react'
import { useMatches } from './useMatches'
import { useSessions } from './useSessions'
import type { Session } from '../types/database'

export type AchievementType = 'win' | 'runner_up'

export interface PlayerAchievement {
  session: Session
  type: AchievementType
  wins: number
  matchesPlayed: number
}

export function usePlayerAchievements(playerId: string) {
  const { data: allMatches, isLoading: matchesLoading } = useMatches()
  const { data: allSessions, isLoading: sessionsLoading } = useSessions()

  const achievements = useMemo<PlayerAchievement[]>(() => {
    if (!allMatches || !allSessions || !playerId) return []

    // Group completed matches by session
    const sessionMatches = new Map<string, typeof allMatches>()
    for (const match of allMatches) {
      if (match.status !== 'COMPLETED') continue
      const list = sessionMatches.get(match.session_id) ?? []
      list.push(match)
      sessionMatches.set(match.session_id, list)
    }

    const result: PlayerAchievement[] = []

    for (const [sessionId, matches] of sessionMatches) {
      const session = allSessions.find((s) => s.id === sessionId)
      if (!session) continue

      // Count wins per player in this session
      const playerWins = new Map<string, number>()
      const playerMatches = new Map<string, number>()

      for (const match of matches) {
        const winnerTeam = match.teams.find((t) => t.is_winner)
        if (!winnerTeam) continue

        for (const p of match.participants) {
          const pid = p.player_id
          playerMatches.set(pid, (playerMatches.get(pid) ?? 0) + 1)
          if (p.team_id === winnerTeam.id) {
            playerWins.set(pid, (playerWins.get(pid) ?? 0) + 1)
          }
        }
      }

      // Rank players by wins desc, then matches played asc (fewer = better)
      const ranked = Array.from(playerWins.entries())
        .map(([pid, wins]) => ({
          playerId: pid,
          wins,
          matchesPlayed: playerMatches.get(pid) ?? wins,
        }))
        .sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins
          return a.matchesPlayed - b.matchesPlayed
        })

      // Find player's rank
      const playerRank = ranked.findIndex((r) => r.playerId === playerId)
      if (playerRank === -1) continue

      const rank = playerRank + 1
      if (rank > 2) continue

      result.push({
        session,
        type: rank === 1 ? 'win' : 'runner_up',
        wins: ranked[playerRank].wins,
        matchesPlayed: ranked[playerRank].matchesPlayed,
      })
    }

    // Sort by session date desc
    return result.sort(
      (a, b) =>
        new Date(b.session.started_at).getTime() -
        new Date(a.session.started_at).getTime()
    )
  }, [allMatches, allSessions, playerId])

  return { achievements, isLoading: matchesLoading || sessionsLoading }
}
