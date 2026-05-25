import { useMemo } from 'react'
import { useMatches } from './useMatches'
import type { Player } from '../types/database'

export interface H2HEntry {
  opponent: Player
  wins: number
  losses: number
  totalMatches: number
}

export function useHeadToHead(playerId: string) {
  const { data: allMatches, isLoading } = useMatches()

  const entries = useMemo<H2HEntry[]>(() => {
    if (!allMatches || !playerId) return []

    const map = new Map<string, { wins: number; losses: number; player: Player }>()

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
        } else {
          map.set(opp.player_id, { wins: isWin ? 1 : 0, losses: isWin ? 0 : 1, player: opp.player })
        }
      }
    }

    return Array.from(map.values())
      .map((s) => ({ opponent: s.player, wins: s.wins, losses: s.losses, totalMatches: s.wins + s.losses }))
      .sort((a, b) => b.totalMatches - a.totalMatches || b.wins - a.wins)
  }, [allMatches, playerId])

  return { entries, isLoading }
}
