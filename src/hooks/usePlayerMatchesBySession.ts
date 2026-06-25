import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Match, MatchTeam, MatchParticipant, MatchScore, MatchWithDetails, Player } from '../types/database'

export function usePlayerMatchesBySession(playerId: string, sessionId: string | null) {
  return useQuery({
    queryKey: ['player-session-matches', playerId, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          teams:match_teams(*),
          participants:match_participants(*, player:players(*)),
          player_filter:match_participants!inner(player_id),
          scores:match_scores(*)
        `)
        .eq('player_filter.player_id', playerId)
        .eq('session_id', sessionId!)
        .eq('status', 'COMPLETED')
        .order('played_at', { ascending: false })

      if (error) throw error

      return (data ?? []).map((m) => ({
        ...(m as Match),
        teams: (m.teams ?? []) as MatchTeam[],
        participants: (m.participants ?? []) as (MatchParticipant & { player: Player })[],
        scores: ((m.scores ?? []) as MatchScore[]).sort((a, b) => a.set_number - b.set_number),
      })) as MatchWithDetails[]
    },
    enabled: !!playerId && !!sessionId,
    staleTime: 5 * 60_000,
  })
}
