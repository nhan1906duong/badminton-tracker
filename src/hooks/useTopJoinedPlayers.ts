import { useMemo } from 'react'
import { usePlayerStats } from './usePlayerStats'
import { usePlayers } from './usePlayers'
import type { Player } from '../types/database'

/**
 * Returns the top-N players by historical match participation.
 * Tie-break: name asc (case-insensitive). Returns all players if total < limit.
 */
export function useTopJoinedPlayers(limit: number) {
  const { stats, isLoading: statsLoading } = usePlayerStats()
  const { data: allPlayers, isLoading: playersLoading } = usePlayers()

  const players = useMemo<Player[]>(() => {
    if (!allPlayers) return []
    const byId = new Map(allPlayers.map((p) => [p.id, p]))
    const sorted = [...stats].sort((a, b) => {
      if (b.matchesPlayed !== a.matchesPlayed) {
        return b.matchesPlayed - a.matchesPlayed
      }
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    })
    const ids = sorted.slice(0, limit).map((s) => s.playerId)
    return ids
      .map((id) => byId.get(id))
      .filter((p): p is Player => !!p)
  }, [stats, allPlayers, limit])

  return { players, isLoading: statsLoading || playersLoading }
}
