import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { AttendanceStatus, SessionAttendance } from '../types/database'

const ATTENDANCES_KEY = 'session-attendances'

export function useSessionAttendances(sessionId: string | undefined) {
  return useQuery({
    queryKey: [ATTENDANCES_KEY, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_attendances')
        .select('*, player:players(*)')
        .eq('session_id', sessionId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as SessionAttendance[]
    },
    enabled: !!sessionId,
  })
}

export function useUpsertAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      sessionId: string
      playerId: string
      status: AttendanceStatus
    }) => {
      const { error } = await supabase.rpc('upsert_attendance', {
        p_session_id: input.sessionId,
        p_player_id: input.playerId,
        p_status: input.status,
      })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [ATTENDANCES_KEY, vars.sessionId] })
    },
  })
}

export function useDeleteAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { sessionId: string; playerId: string }) => {
      const { error } = await supabase.rpc('delete_attendance', {
        p_session_id: input.sessionId,
        p_player_id: input.playerId,
      })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [ATTENDANCES_KEY, vars.sessionId] })
    },
  })
}
