import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session } from '../types/database'

export interface PlayerSessionStat {
  session: Session
  matchCount: number
  wins: number
  losses: number
  sessionRank: number
  weeklyPoints: number
  pointDifference: number
  ratingDelta: number
}

export const PLAYER_SESSION_STATS_KEY = 'player-session-stats'

export function usePlayerSessionStats(playerId: string) {
  return useQuery({
    queryKey: [PLAYER_SESSION_STATS_KEY, playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_session_stats')
        .select(`
          total_matches,
          total_wins,
          session_rank,
          total_weekly_points,
          points_for,
          points_against,
          total_rating_delta,
          session:sessions!session_id(
            id, label, started_at, ended_at, type,
            bwf_tournament_id, league_match_type, league_total_rounds, created_at
          )
        `)
        .eq('player_id', playerId)

      if (error) throw error

      return (data ?? [])
        .filter(row => row.session != null)
        .sort(
          (a, b) =>
            new Date((b.session as unknown as Session).started_at).getTime() -
            new Date((a.session as unknown as Session).started_at).getTime(),
        )
        .map(row => {
          const session = row.session as unknown as Session
          const r = row as unknown as typeof row & {
            total_weekly_points: number
            points_for: number
            points_against: number
            total_rating_delta: number
          }
          return {
            session,
            matchCount: r.total_matches,
            wins: r.total_wins,
            losses: r.total_matches - r.total_wins,
            sessionRank: r.session_rank,
            weeklyPoints: r.total_weekly_points,
            pointDifference: r.points_for - r.points_against,
            ratingDelta: Number(r.total_rating_delta),
          }
        }) as PlayerSessionStat[]
    },
    enabled: !!playerId,
    staleTime: 5 * 60_000,
  })
}
