import { useMemo } from 'react'
import { useMatches } from './useMatches'
import type { MatchWithDetails, Player } from '../types/database'

export interface H2HEntry {
  opponent: Player
  wins: number
  losses: number
  totalMatches: number
  matches: MatchWithDetails[]
}

export function useHeadToHead(playerId: string) {
  const { data: allMatches, isLoading } = useMatches()

  const entries = useMemo<H2HEntry[]>(() => {
    if (!allMatches || !playerId) return []

    const map = new Map<
      string,
      { wins: number; losses: number; player: Player; matches: MatchWithDetails[] }
    >()

    for (const match of allMatches) {
      if (match.status !== 'COMPLETED') continue
      const pp = match.participants.find((p) => p.player_id === playerId)
      if (!pp) continue
      const playerTeam = match.teams.find((t) => t.id === pp.team_id)
      if (!playerTeam) continue
      if (!match.teams.some((t) => t.is_winner)) continue
      const isWin = playerTeam.is_winner

      for (const opp of match.participants.filter((p) => p.team_id !== pp.team_id)) {
        const entry = map.get(opp.player_id)
        if (entry) {
          if (isWin) entry.wins++
          else entry.losses++
          entry.matches.push(match)
        } else {
          map.set(opp.player_id, {
            wins: isWin ? 1 : 0,
            losses: isWin ? 0 : 1,
            player: opp.player,
            matches: [match],
          })
        }
      }
    }

    return Array.from(map.values())
      .map((s) => ({
        opponent: s.player,
        wins: s.wins,
        losses: s.losses,
        totalMatches: s.wins + s.losses,
        matches: s.matches,
      }))
      .sort((a, b) => {
        const rateA = a.totalMatches > 0 ? a.wins / a.totalMatches : 0
        const rateB = b.totalMatches > 0 ? b.wins / b.totalMatches : 0
        return rateB - rateA || b.totalMatches - a.totalMatches
      })
  }, [allMatches, playerId])

  return { entries, isLoading }
}
