import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session } from '../types/database'

const SESSIONS_KEY = 'sessions'

export function useSessions() {
  return useQuery({
    queryKey: [SESSIONS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
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
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .is('ended_at', null)
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

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      label?: string
      started_at?: string
      bwf_tournament_id?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Guard: reject if a session with the same tournament already exists
      if (input.bwf_tournament_id) {
        const { data: existing } = await supabase
          .from('sessions')
          .select('id')
          .eq('bwf_tournament_id', input.bwf_tournament_id)
          .limit(1)
          .maybeSingle()
        if (existing) throw new DuplicateTournamentError()
      }

      // Create new session
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          label: input.label || null,
          started_at: input.started_at ?? new Date().toISOString(),
          bwf_tournament_id: input.bwf_tournament_id || null,
          created_by: user.id,
        })
        .select()
        .single()
      if (error) throw error
      return data as Session
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
        .select('*')
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
      const { error } = await supabase
        .from('sessions')
        .update({ started_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
    },
  })
}

export function useEndSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Find all matches in this session to clean up children explicitly
      const { data: matchRows, error: listError } = await supabase
        .from('matches')
        .select('id')
        .eq('session_id', id)
      if (listError) throw listError

      const matchIds = (matchRows ?? []).map((m) => m.id)

      if (matchIds.length > 0) {
        const { error: scoresError } = await supabase
          .from('match_scores')
          .delete()
          .in('match_id', matchIds)
        if (scoresError) throw scoresError

        const { error: partsError } = await supabase
          .from('match_participants')
          .delete()
          .in('match_id', matchIds)
        if (partsError) throw partsError

        const { error: teamsError } = await supabase
          .from('match_teams')
          .delete()
          .in('match_id', matchIds)
        if (teamsError) throw teamsError

        const { error: matchesError } = await supabase
          .from('matches')
          .delete()
          .in('id', matchIds)
        if (matchesError) throw matchesError
      }

      const { error } = await supabase.from('sessions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
    },
  })
}

export function useClearAllData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Delete all uploaded avatars from storage
      const { data: userFiles } = await supabase.storage.from('avatars').list('users')
      const { data: playerFiles } = await supabase.storage.from('avatars').list('players')

      const toDelete: string[] = []
      if (userFiles) {
        toDelete.push(...userFiles.map(f => `users/${f.name}`))
      }
      if (playerFiles) {
        toDelete.push(...playerFiles.map(f => `players/${f.name}`))
      }
      if (toDelete.length > 0) {
        await supabase.storage.from('avatars').remove(toDelete)
      }

      // 2. Delete child tables first, then parents (cascade handles most,
      // but explicit ordering avoids relying solely on DB config)
      await supabase.from('match_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('match_participants').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('match_teams').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // 3. Clear player avatars in DB, then delete players
      await supabase.from('players').update({ avatar_url: null }).neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // 4. Clear user profile avatars (keep profiles row, just remove avatar_url)
      await supabase.from('profiles').update({ avatar_url: null }).neq('id', '00000000-0000-0000-0000-000000000000')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}
