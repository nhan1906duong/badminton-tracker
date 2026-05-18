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

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Close any prior open session for this user
      await supabase
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('created_by', user.id)
        .is('ended_at', null)

      // Create new session
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          label: input.label || null,
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
