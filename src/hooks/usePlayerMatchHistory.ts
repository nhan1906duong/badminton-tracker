import { useMemo } from 'react'
import { useMatches } from './useMatches'
import { useSessions } from './useSessions'
import type { MatchWithDetails, Session } from '../types/database'

export interface PlayerSessionHistory {
  session: Session
  matches: MatchWithDetails[]
  wins: number
  losses: number
}

export function usePlayerMatchHistory(playerId: string) {
  const { data: allMatches, isLoading: matchesLoading } = useMatches()
  const { data: allSessions, isLoading: sessionsLoading } = useSessions()

  const history = useMemo<PlayerSessionHistory[]>(() => {
    if (!allMatches || !allSessions || !playerId) return []

    const playerMatches = allMatches.filter((m) =>
      m.participants.some((p) => p.player_id === playerId)
    )

    const sessionMap = new Map<string, MatchWithDetails[]>()
    for (const match of playerMatches) {
      const existing = sessionMap.get(match.session_id) ?? []
      existing.push(match)
      sessionMap.set(match.session_id, existing)
    }

    const result: PlayerSessionHistory[] = []
    for (const [sessionId, matches] of sessionMap.entries()) {
      const session = allSessions.find((s) => s.id === sessionId)
      if (!session) continue

      let wins = 0
      let losses = 0
      for (const match of matches) {
        if (match.status !== 'COMPLETED') continue
        if (!match.teams.some((t) => t.is_winner)) continue
        const pp = match.participants.find((p) => p.player_id === playerId)
        if (!pp) continue
        const team = match.teams.find((t) => t.id === pp.team_id)
        if (!team) continue
        if (team.is_winner) wins++
        else losses++
      }

      const countedMatches = matches.filter(
        (m) => m.status === 'COMPLETED' && m.teams.some((t) => t.is_winner)
      )
      if (countedMatches.length === 0) continue

      result.push({ session, matches: countedMatches, wins, losses })
    }

    return result.sort(
      (a, b) =>
        new Date(b.session.started_at).getTime() -
        new Date(a.session.started_at).getTime()
    )
  }, [allMatches, allSessions, playerId])

  return { history, isLoading: matchesLoading || sessionsLoading }
}
