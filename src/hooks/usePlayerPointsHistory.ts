import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { MatchWithDetails, PlayerMatchResult, Session } from '../types/database'

export interface MatchPointsEntry {
  match: MatchWithDetails & { session: Session }
  points: PlayerMatchResult
}

export interface SessionPointsHistory {
  session: Session
  matches: MatchPointsEntry[]
  totalPoints: number
  totalRatingDelta: number
}

type ResultWithMatch = PlayerMatchResult & {
  match: MatchWithDetails & { session: Session }
}

export function usePlayerPointsHistory(playerId: string) {
  const { data: rawResults, isLoading } = useQuery({
    queryKey: ['player-points-history', playerId],
    enabled: !!playerId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_match_results')
        .select(`
          *,
          match:matches(
            *,
            session:sessions(*),
            teams:match_teams(*),
            participants:match_participants(*, player:players(*)),
            scores:match_scores(*)
          )
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ResultWithMatch[]
    },
  })

  const history = useMemo<SessionPointsHistory[]>(() => {
    if (!rawResults || !playerId) return []

    const sessionMap = new Map<string, { session: Session; matches: MatchPointsEntry[] }>()

    for (const result of rawResults) {
      const match = result.match
      if (!match) continue
      const session = match.session
      if (!session) continue

      // Only include matches with a declared winner (ranked matches)
      if (!match.teams.some((t) => t.is_winner)) continue

      const entry = sessionMap.get(session.id) ?? { session, matches: [] }
      entry.matches.push({ match, points: result })
      sessionMap.set(session.id, entry)
    }

    return Array.from(sessionMap.values())
      .map(({ session, matches }) => ({
        session,
        matches: matches.sort(
          (a, b) =>
            new Date(a.match.played_at).getTime() -
            new Date(b.match.played_at).getTime(),
        ),
        totalPoints: matches.reduce((sum, m) => sum + m.points.total_weekly_points, 0),
        totalRatingDelta: matches.reduce(
          (sum, m) => sum + (m.points.rating_delta ?? 0),
          0,
        ),
      }))
      .sort(
        (a, b) =>
          new Date(b.session.started_at).getTime() -
          new Date(a.session.started_at).getTime(),
      )
  }, [rawResults, playerId])

  return { history, isLoading }
}
