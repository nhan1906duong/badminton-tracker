import { useMemo } from 'react'
import { usePlayerMatches } from './usePlayerMatches'
import type { MatchWithDetails, Session } from '../types/database'

export interface PlayerSessionHistory {
  session: Session
  matches: MatchWithDetails[]
  wins: number
  losses: number
}

export function usePlayerMatchHistory(playerId: string) {
  const query = usePlayerMatches(playerId)
  const allMatches = query.data?.pages.flatMap((p) => p.matches) ?? []

  const history = useMemo<PlayerSessionHistory[]>(() => {
    if (!playerId || allMatches.length === 0) return []

    const sessionMap = new Map<string, { session: Session; matches: MatchWithDetails[] }>()

    for (const match of allMatches) {
      // Each match includes an embedded session object via session:sessions(*)
      const session = (match as MatchWithDetails & { session?: Session | null }).session
      if (!session) continue

      const entry = sessionMap.get(match.session_id) ?? { session, matches: [] }
      entry.matches.push(match)
      sessionMap.set(match.session_id, entry)
    }

    const result: PlayerSessionHistory[] = []
    for (const { session, matches } of sessionMap.values()) {
      let wins = 0
      let losses = 0
      for (const match of matches) {
        if (!match.teams.some((t) => t.is_winner)) continue
        const pp = match.participants.find((p) => p.player_id === playerId)
        if (!pp) continue
        const team = match.teams.find((t) => t.id === pp.team_id)
        if (!team) continue
        if (team.is_winner) wins++
        else losses++
      }
      if (matches.length === 0) continue
      result.push({ session, matches, wins, losses })
    }

    return result.sort(
      (a, b) =>
        new Date(b.session.started_at).getTime() -
        new Date(a.session.started_at).getTime(),
    )
  }, [allMatches, playerId])

  return {
    history,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
  }
}
