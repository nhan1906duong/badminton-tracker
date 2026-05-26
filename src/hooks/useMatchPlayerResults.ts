import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PlayerMatchResult } from '../types/database'

export function useMatchPlayerResults(matchId: string) {
  return useQuery({
    queryKey: ['match-player-results', matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_match_results')
        .select('*')
        .eq('match_id', matchId)
      if (error) throw error
      return data as PlayerMatchResult[]
    },
    enabled: !!matchId,
  })
}
