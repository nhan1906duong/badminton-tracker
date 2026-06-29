import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ['profiles', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      return data as Profile | null
    },
    enabled: !!userId,
  })
}

export function useUpdatePlayerLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId: _userId,
      playerId,
    }: {
      userId: string
      playerId: string | null
    }) => {
      if (playerId) {
        const { error } = await supabase.rpc('update_player_link', { p_player_id: playerId })
        if (error) throw error
      } else {
        const { error } = await supabase.rpc('clear_player_link')
        if (error) throw error
      }
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['profiles', userId] })
    },
  })
}
