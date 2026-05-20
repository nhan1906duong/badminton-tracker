import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Match, MatchTeam, MatchParticipant, MatchScore, MatchWithDetails, Player } from '../types/database'

const PAGE_SIZE = 10
const PLAYER_MATCHES_KEY = 'player-matches'

export function usePlayerMatches(playerId: string) {
  return useInfiniteQuery({
    queryKey: [PLAYER_MATCHES_KEY, playerId],
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          teams:match_teams(*),
          participants:match_participants!inner(*, player:players(*)),
          scores:match_scores(*)
        `)
        .eq('match_participants.player_id', playerId)
        .order('played_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)

      if (error) throw error

      const matches = (data ?? []).map((m) => ({
        ...(m as Match),
        teams: (m.teams ?? []) as MatchTeam[],
        participants: (m.participants ?? []) as (MatchParticipant & { player: Player })[],
        scores: ((m.scores ?? []) as MatchScore[]).sort((a, b) => a.set_number - b.set_number),
      })) as MatchWithDetails[]

      return { matches, hasMore: matches.length === PAGE_SIZE }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      return lastPage.hasMore ? lastPageParam + 1 : undefined
    },
    enabled: !!playerId,
  })
}
