import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Player } from '../types/database'

const PLAYERS_KEY = 'players'

export function usePlayers() {
  return useQuery({
    queryKey: [PLAYERS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Player[]
    },
  })
}

export function usePlayer(id: string) {
  return useQuery({
    queryKey: [PLAYERS_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Player
    },
    enabled: !!id,
  })
}

export function useCreatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (player: Pick<Player, 'name' | 'email'>) => {
      const { data, error } = await supabase.rpc('create_player', {
        p_name: player.name,
        p_email: player.email || null,
      })
      if (error) throw error
      return data[0] as Player
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PLAYERS_KEY] }),
  })
}

export function useUpdatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (player: Partial<Player> & { id: string }) => {
      const { data, error } = await supabase.rpc('update_player', {
        p_id: player.id,
        p_name: player.name ?? null,
        p_email: player.email ?? null,
        p_avatar_url: player.avatar_url !== undefined && player.avatar_url !== null ? player.avatar_url : null,
        p_active_racket_id: player.active_racket_id ?? null,
        p_clear_avatar: player.avatar_url === null,
      })
      if (error) throw error
      return data[0] as Player
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [PLAYERS_KEY] })
      qc.invalidateQueries({ queryKey: [PLAYERS_KEY, data.id] })
    },
  })
}

export function useDeletePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_player', { p_id: id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PLAYERS_KEY] }),
  })
}
