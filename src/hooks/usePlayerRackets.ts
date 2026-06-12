import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PlayerRacket } from '../types/database'

const PLAYER_RACKETS_KEY = 'player-rackets'

export function usePlayerRackets(playerId: string) {
  return useQuery({
    queryKey: [PLAYER_RACKETS_KEY, playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_rackets')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at')
      if (error) throw error
      return data as PlayerRacket[]
    },
    enabled: !!playerId,
  })
}

export function useCreatePlayerRacket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (racket: { player_id: string; brand: string; real_name: string; nickname?: string }) => {
      const { data, error } = await supabase
        .from('player_rackets')
        .insert({
          player_id: racket.player_id,
          brand: racket.brand,
          real_name: racket.real_name,
          nickname: racket.nickname || null,
        })
        .select()
        .single()
      if (error) throw error
      return data as PlayerRacket
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [PLAYER_RACKETS_KEY, data.player_id] }),
  })
}

export function useUpdatePlayerRacket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (racket: { id: string; brand: string; real_name: string; nickname?: string }) => {
      const { data, error } = await supabase
        .from('player_rackets')
        .update({ brand: racket.brand, real_name: racket.real_name, nickname: racket.nickname || null })
        .eq('id', racket.id)
        .select()
        .single()
      if (error) throw error
      return data as PlayerRacket
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [PLAYER_RACKETS_KEY, data.player_id] }),
  })
}

export function useDeletePlayerRacket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (racket: { id: string; player_id: string }) => {
      const { error } = await supabase.from('player_rackets').delete().eq('id', racket.id)
      if (error) throw error
      return racket
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [PLAYER_RACKETS_KEY, data.player_id] }),
  })
}
