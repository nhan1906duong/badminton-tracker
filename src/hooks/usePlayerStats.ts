import { useMemo } from 'react'
import { useMatches } from './useMatches'
import { usePlayers } from './usePlayers'
import { LOSS_PENALTY_VND } from '../lib/currency'

export interface PlayerStats {
  playerId: string
  name: string
  matchesPlayed: number
  wins: number
  losses: number
}

export function usePlayerStats(sessionId?: string) {
  const { data: matches, isLoading: matchesLoading } = useMatches(sessionId)
  const { data: players, isLoading: playersLoading } = usePlayers()

  const stats = useMemo(() => {
    if (!players || !matches) return []

    const map = new Map<string, PlayerStats>()

    for (const p of players) {
      map.set(p.id, {
        playerId: p.id,
        name: p.name,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
      })
    }

    for (const match of matches) {
      const winnerTeam = match.teams.find((t) => t.is_winner)
      const winnerLabel = winnerTeam?.team_label

      for (const participant of match.participants) {
        const pid = participant.player_id
        const s = map.get(pid)
        if (!s) continue

        s.matchesPlayed += 1
        const playerTeam = match.teams.find((t) => t.id === participant.team_id)?.team_label
        if (playerTeam === winnerLabel) {
          s.wins += 1
        } else {
          s.losses += 1
        }
      }
    }

    return Array.from(map.values())
  }, [players, matches])

  const sortedByMatches = useMemo(
    () => [...stats].sort((a, b) => b.matchesPlayed - a.matchesPlayed),
    [stats]
  )

  const sortedByWins = useMemo(
    () => [...stats].sort((a, b) => b.wins - a.wins),
    [stats]
  )

  const totalLost = useMemo(
    () => stats.reduce((sum, s) => sum + s.losses, 0),
    [stats]
  )

  return {
    stats,
    sortedByMatches,
    sortedByWins,
    totalLost,
    isLoading: matchesLoading || playersLoading,
  }
}

// Session-scoped donation aggregator: wraps usePlayerStats with sessionId
// and returns the donors list (players with >=1 loss) sorted by losses desc.
export interface Donor extends PlayerStats {
  avatarUrl: string | null
}

export function useSessionDonationStats(sessionId: string) {
  const { stats, totalLost, isLoading } = usePlayerStats(sessionId)
  const { data: players } = usePlayers()

  const avatarMap = useMemo(() => {
    const m = new Map<string, string | null>()
    players?.forEach((p) => m.set(p.id, p.avatar_url ?? null))
    return m
  }, [players])

  const donors = useMemo<Donor[]>(
    () =>
      stats
        .filter((s) => s.losses > 0)
        .sort((a, b) => b.losses - a.losses)
        .map((s) => ({ ...s, avatarUrl: avatarMap.get(s.playerId) ?? null })),
    [stats, avatarMap]
  )

  return {
    totalLosses: totalLost,
    totalDonatedVnd: totalLost * LOSS_PENALTY_VND,
    donors,
    isLoading,
  }
}
