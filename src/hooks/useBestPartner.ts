import { useMemo } from 'react'
import { useMatches } from './useMatches'
import type { Player } from '../types/database'

const DOUBLES_TYPES = ['MEN_DOUBLES', 'WOMEN_DOUBLES', 'MIXED_DOUBLES']

export interface BestPartnerResult {
  partner: Player | null
  winRate: number
  totalMatches: number
  wins: number
}

export function useBestPartner(playerId: string) {
  const { data: matches, isLoading } = useMatches()

  const result = useMemo<BestPartnerResult>(() => {
    if (!matches || !playerId) {
      return { partner: null, winRate: 0, totalMatches: 0, wins: 0 }
    }

    const playerMatches = matches.filter((m) => {
      if (!DOUBLES_TYPES.includes(m.match_type)) return false
      return m.participants.some((p) => p.player_id === playerId)
    })

    if (playerMatches.length === 0) {
      return { partner: null, winRate: 0, totalMatches: 0, wins: 0 }
    }

    const teammateStats = new Map<string, { total: number; wins: number; player: Player }>()

    for (const match of playerMatches) {
      const playerParticipant = match.participants.find((p) => p.player_id === playerId)
      if (!playerParticipant) continue

      const playerTeamId = playerParticipant.team_id
      const isWinner = match.teams.find((t) => t.id === playerTeamId)?.is_winner ?? false

      const teammates = match.participants.filter(
        (p) => p.team_id === playerTeamId && p.player_id !== playerId
      )

      for (const teammate of teammates) {
        const stats = teammateStats.get(teammate.player_id)
        if (stats) {
          stats.total += 1
          if (isWinner) stats.wins += 1
        } else {
          teammateStats.set(teammate.player_id, {
            total: 1,
            wins: isWinner ? 1 : 0,
            player: teammate.player,
          })
        }
      }
    }

    if (teammateStats.size === 0) {
      return { partner: null, winRate: 0, totalMatches: 0, wins: 0 }
    }

    const sorted = Array.from(teammateStats.values()).sort((a, b) => {
      const rateA = a.total > 0 ? a.wins / a.total : 0
      const rateB = b.total > 0 ? b.wins / b.total : 0
      if (rateB !== rateA) return rateB - rateA
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.total - a.total
    })

    const best = sorted[0]
    return {
      partner: best.player,
      winRate: best.total > 0 ? best.wins / best.total : 0,
      totalMatches: best.total,
      wins: best.wins,
    }
  }, [matches, playerId])

  return { ...result, isLoading }
}
