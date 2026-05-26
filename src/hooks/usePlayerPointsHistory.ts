import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useMatches } from './useMatches'
import { useSessions } from './useSessions'
import type { MatchWithDetails, PlayerMatchResult, Session } from '../types/database'

export interface MatchPointsEntry {
  match: MatchWithDetails
  points: PlayerMatchResult
}

export interface SessionPointsHistory {
  session: Session
  matches: MatchPointsEntry[]
  totalPoints: number
  totalRatingDelta: number
}

export function usePlayerPointsHistory(playerId: string) {
  const { data: allMatches, isLoading: matchesLoading } = useMatches()
  const { data: allSessions, isLoading: sessionsLoading } = useSessions()

  const { data: pointResults, isLoading: pointsLoading } = useQuery({
    queryKey: ['player-points-history', playerId],
    enabled: !!playerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_match_results')
        .select('*')
        .eq('player_id', playerId)
      if (error) throw error
      return data as PlayerMatchResult[]
    },
  })

  const history = useMemo<SessionPointsHistory[]>(() => {
    if (!allMatches || !allSessions || !pointResults || !playerId) return []

    const pointMap = new Map(pointResults.map((r) => [r.match_id, r]))

    const playerMatches = allMatches.filter(
      (m) =>
        m.participants.some((p) => p.player_id === playerId) &&
        m.status === 'COMPLETED' &&
        m.teams.some((t) => t.is_winner)
    )

    const sessionMap = new Map<string, { session: Session; matches: MatchPointsEntry[] }>()

    for (const match of playerMatches) {
      const points = pointMap.get(match.id)
      if (!points) continue
      const session = allSessions.find((s) => s.id === match.session_id)
      if (!session) continue
      if (!sessionMap.has(session.id)) {
        sessionMap.set(session.id, { session, matches: [] })
      }
      sessionMap.get(session.id)!.matches.push({ match, points })
    }

    return Array.from(sessionMap.values())
      .map(({ session, matches }) => ({
        session,
        matches: matches.sort(
          (a, b) => new Date(a.match.played_at).getTime() - new Date(b.match.played_at).getTime()
        ),
        totalPoints: matches.reduce((sum, m) => sum + m.points.total_weekly_points, 0),
        totalRatingDelta: matches.reduce((sum, m) => sum + (m.points.rating_delta ?? 0), 0),
      }))
      .sort(
        (a, b) =>
          new Date(b.session.started_at).getTime() - new Date(a.session.started_at).getTime()
      )
  }, [allMatches, allSessions, pointResults, playerId])

  return { history, isLoading: matchesLoading || sessionsLoading || pointsLoading }
}
