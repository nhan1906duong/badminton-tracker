import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PlayerRankingStats } from './useRankings'

/**
 * Fetches a single player's ranking summary from the get_player_ranking_summary RPC.
 * Avoids loading the full leaderboard just to find one player's rank/stats.
 */
export function usePlayerRankingSummary(playerId: string) {
  return useQuery({
    queryKey: ['player-ranking-summary', playerId],
    enabled: !!playerId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_player_ranking_summary', {
        p_player_id: playerId,
      })
      if (error) throw error
      return data as PlayerRankingStats | null
    },
  })
}
