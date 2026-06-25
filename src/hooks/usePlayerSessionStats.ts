import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session } from '../types/database'

export interface PlayerSessionStat {
  session: Session
  matchCount: number
  wins: number
  losses: number
  sessionRank: number
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
          session:sessions!session_id(
            id, label, started_at, ended_at, type,
            bwf_tournament_id, league_match_type, league_total_rounds, created_at
          )
        `)
        .eq('player_id', playerId)

      if (error) throw error

      return (data ?? [])
        .filter((row) => row.session != null)
        .sort(
          (a, b) =>
            new Date((b.session as unknown as Session).started_at).getTime() -
            new Date((a.session as unknown as Session).started_at).getTime(),
        )
        .map((row) => {
          const session = row.session as unknown as Session
          return {
            session,
            matchCount: row.total_matches,
            wins: row.total_wins,
            losses: row.total_matches - row.total_wins,
            sessionRank: row.session_rank,
          }
        }) as PlayerSessionStat[]
    },
    enabled: !!playerId,
    staleTime: 5 * 60_000,
  })
}
