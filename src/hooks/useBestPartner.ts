import { useMemo } from 'react'
import { useMatches } from './useMatches'
import type { MatchWithDetails, Player } from '../types/database'

const DOUBLES_TYPES = ['MEN_DOUBLES', 'WOMEN_DOUBLES', 'MIXED_DOUBLES']

export interface PartnerEntry {
  partner: Player
  winRate: number
  totalMatches: number
  wins: number
  matches: MatchWithDetails[]
}

export function useBestPartner(playerId: string) {
  const { data: matches, isLoading } = useMatches()

  const allPartners = useMemo<PartnerEntry[]>(() => {
    if (!matches || !playerId) return []

    const playerMatches = matches.filter((m) => {
      if (m.status !== 'COMPLETED') return false
      if (!m.teams.some((t) => t.is_winner)) return false
      if (!DOUBLES_TYPES.includes(m.match_type)) return false
      return m.participants.some((p) => p.player_id === playerId)
    })

    if (playerMatches.length === 0) return []

    const teammateStats = new Map<
      string,
      { total: number; wins: number; player: Player; matches: MatchWithDetails[] }
    >()

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
          stats.matches.push(match)
        } else {
          teammateStats.set(teammate.player_id, {
            total: 1,
            wins: isWinner ? 1 : 0,
            player: teammate.player,
            matches: [match],
          })
        }
      }
    }

    return Array.from(teammateStats.values())
      .sort((a, b) => {
        const rateA = a.total > 0 ? a.wins / a.total : 0
        const rateB = b.total > 0 ? b.wins / b.total : 0
        if (rateB !== rateA) return rateB - rateA
        if (b.wins !== a.wins) return b.wins - a.wins
        return b.total - a.total
      })
      .map((s) => ({
        partner: s.player,
        winRate: s.total > 0 ? s.wins / s.total : 0,
        totalMatches: s.total,
        wins: s.wins,
        matches: s.matches,
      }))
  }, [matches, playerId])

  return { allPartners, isLoading }
}
