import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { MatchType, Session, SessionType } from '../types/database'

const SESSIONS_KEY = 'sessions'

export function useSessions() {
  return useQuery({
    queryKey: [SESSIONS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          '*, bwf_tournaments(category_name, category_slug), type, league_match_type, league_total_rounds',
        )
        .order('started_at', { ascending: false })
      if (error) throw error
      return data as Session[]
    },
  })
}

export function useOpenSession() {
  return useQuery({
    queryKey: [SESSIONS_KEY, 'open'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('sessions')
        .select(
          '*, bwf_tournaments(category_name, category_slug), type, league_match_type, league_total_rounds',
        )
        .is('ended_at', null)
        .eq('created_by', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()
      if (error) {
        if (error.code === 'PGRST116') return null // no rows
        throw error
      }
      return data as Session
    },
  })
}

export class DuplicateTournamentError extends Error {
  constructor() {
    super('A session for this tournament already exists.')
    this.name = 'DuplicateTournamentError'
  }
}

export interface CreateSessionInput {
  type: SessionType
  label?: string
  started_at?: string
  bwf_tournament_id?: string
  league_match_type?: MatchType
  league_total_rounds?: number
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const { data, error } = await supabase.rpc('create_session', {
        p_type: input.type,
        p_label: input.label || null,
        p_started_at: input.started_at ?? new Date().toISOString(),
        p_bwf_tournament_id: input.bwf_tournament_id || null,
        p_league_match_type: input.league_match_type || null,
        p_league_total_rounds: input.league_total_rounds || null,
      })
      if (error) {
        if (error.message?.includes('A session for this tournament already exists')) {
          throw new DuplicateTournamentError()
        }
        throw error
      }
      return data[0] as Session
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
    },
  })
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: [SESSIONS_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          '*, bwf_tournaments(category_name, category_slug), type, league_match_type, league_total_rounds',
        )
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Session
    },
    enabled: !!id,
  })
}

export function useStartSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('start_session', { p_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
    },
  })
}

export function useUpdateSessionStartTime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, started_at }: { id: string; started_at: string }) => {
      const { error } = await supabase.rpc('update_session_start_time', {
        p_id: id,
        p_started_at: started_at,
      })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY, vars.id] })
    },
  })
}

export function useRenameSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await supabase.rpc('rename_session', { p_id: id, p_label: label })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY, vars.id] })
    },
  })
}

export function useEndSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('end_session', { p_id: id })
      if (error) throw error
      return data[0] as Session
    },
    onSuccess: session => {
      qc.setQueryData([SESSIONS_KEY, session.id], session)
      qc.setQueryData<Session[] | undefined>([SESSIONS_KEY], sessions =>
        sessions?.map(s => (s.id === session.id ? session : s)),
      )
      qc.setQueryData<Session | null | undefined>([SESSIONS_KEY, 'open'], openSession =>
        openSession?.id === session.id ? null : openSession,
      )
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['player-rankings'] })
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      qc.invalidateQueries({ queryKey: ['player-ranking-summary'] })
      qc.invalidateQueries({ queryKey: ['player-session-stats'] })
      qc.invalidateQueries({ queryKey: ['completed-match-count'] })
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_session', { p_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      qc.invalidateQueries({ queryKey: ['player-ranking-summary'] })
      qc.invalidateQueries({ queryKey: ['player-session-stats'] })
    },
  })
}

export function useClearAllData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // 1. Delete uploaded avatars from storage (MUST stay client-side — PL/pgSQL can't call Storage API)
      const { data: userFiles } = await supabase.storage.from('avatars').list('users')
      const { data: playerFiles } = await supabase.storage.from('avatars').list('players')

      const toDelete: string[] = []
      if (userFiles) toDelete.push(...userFiles.map(f => `users/${f.name}`))
      if (playerFiles) toDelete.push(...playerFiles.map(f => `players/${f.name}`))
      if (toDelete.length > 0) {
        await supabase.storage.from('avatars').remove(toDelete)
      }

      // 2. DB cleanup via RPC (handles all table deletions + profile avatar reset)
      const { error } = await supabase.rpc('clear_all_data')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

/**
 * Replays all match history from scratch to populate player_match_results and player ratings.
 * Use this once to retroactively process sessions that existed before the rating system was added,
 * or to fix ratings after data corrections.
 *
 * Algorithm:
 *   - Resets all player ratings to 1000
 *   - Processes every session in chronological order (started_at ASC)
 *   - Within each session processes matches in played_at ASC order
 *   - Elo changes are applied running (match-by-match) so ratings stay accurate throughout
 *   - Ended sessions: all fields including rating_before/after/delta are stored
 *   - Open sessions: weekly points are stored, rating columns stay null (filled when session ends)
 */
export function useRecalculateAllRatings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('recalculate_all_ratings')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-rankings'] })
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      qc.invalidateQueries({ queryKey: ['player-ranking-summary'] })
      qc.invalidateQueries({ queryKey: ['player-session-stats'] })
      qc.invalidateQueries({ queryKey: ['completed-match-count'] })
    },
  })
}

export function useUpdateLeagueTotalRounds() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      league_total_rounds,
    }: {
      id: string
      league_total_rounds: number
    }) => {
      const { error } = await supabase.rpc('update_league_total_rounds', {
        p_id: id,
        p_rounds: league_total_rounds,
      })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY, vars.id] })
    },
  })
}
