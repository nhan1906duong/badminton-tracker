import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type {
  Match,
  MatchParticipant,
  MatchScore,
  MatchTeam,
  MatchWithDetails,
  Player,
  Session,
} from '../types/database'

const PAGE_SIZE = 20

export interface PlayerMatchCursor {
  played_at: string
  id: string
}

export function usePlayerMatches(playerId: string) {
  return useInfiniteQuery({
    queryKey: ['player-matches', playerId],
    queryFn: async ({ pageParam }: { pageParam: PlayerMatchCursor | null }) => {
      // Dual-alias select:
      //   player_filter: inner join used only for filtering — keeps PostgREST from
      //     stripping other participants out of the `participants` alias.
      //   participants: returns the full participant list including all players.
      let query = supabase
        .from('matches')
        .select(`
          *,
          session:sessions(*),
          teams:match_teams(*),
          participants:match_participants(*, player:players(*)),
          player_filter:match_participants!inner(player_id),
          scores:match_scores(*)
        `)
        .eq('player_filter.player_id', playerId)
        .eq('status', 'COMPLETED')
        .order('played_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE)

      if (pageParam) {
        query = query.or(
          `played_at.lt.${pageParam.played_at},` +
            `and(played_at.eq.${pageParam.played_at},id.lt.${pageParam.id})`,
        )
      }

      const { data, error } = await query
      if (error) throw error

      const matches = (data ?? []).map(m => ({
        ...(m as Match),
        session: m.session as Session | null,
        teams: (m.teams ?? []) as MatchTeam[],
        participants: (m.participants ?? []) as (MatchParticipant & { player: Player })[],
        scores: ((m.scores ?? []) as MatchScore[]).sort((a, b) => a.set_number - b.set_number),
      })) as (MatchWithDetails & { session: Session | null })[]

      const last = matches[matches.length - 1]
      const nextCursor: PlayerMatchCursor | null =
        matches.length === PAGE_SIZE && last ? { played_at: last.played_at, id: last.id } : null

      return { matches, nextCursor }
    },
    initialPageParam: null as PlayerMatchCursor | null,
    getNextPageParam: lastPage => lastPage.nextCursor,
    enabled: !!playerId,
    staleTime: 5 * 60_000,
  })
}
