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
      const { data, error } = await supabase
        .from('players')
        .insert({ name: player.name, email: player.email || null })
        .select()
        .single()
      if (error) throw error
      return data as Player
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PLAYERS_KEY] }),
  })
}

export function useUpdatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (player: Partial<Player> & { id: string }) => {
      const { data, error } = await supabase
        .from('players')
        .update(player)
        .eq('id', player.id)
        .select()
        .single()
      if (error) throw error
      return data as Player
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
      // match_participants.player_id has no ON DELETE CASCADE —
      // delete participation records first to avoid FK violation.
      const { error: partsError } = await supabase
        .from('match_participants')
        .delete()
        .eq('player_id', id)
      if (partsError) throw partsError

      const { error } = await supabase.from('players').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PLAYERS_KEY] }),
  })
}
