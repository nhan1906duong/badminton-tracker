import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PlayerQuote } from '../types/database'

const PLAYER_QUOTES_KEY = 'player-quotes'

export function usePlayerQuotes(playerId: string) {
  return useQuery({
    queryKey: [PLAYER_QUOTES_KEY, playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_quotes')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PlayerQuote[]
    },
    enabled: !!playerId,
  })
}

export function useCreatePlayerQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quote: { player_id: string; text: string }) => {
      const { data, error } = await supabase
        .from('player_quotes')
        .insert({ player_id: quote.player_id, text: quote.text })
        .select()
        .single()
      if (error) throw error
      return data as PlayerQuote
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [PLAYER_QUOTES_KEY, data.player_id] }),
  })
}

export function useUpdatePlayerQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quote: { id: string; text: string }) => {
      const { data, error } = await supabase
        .from('player_quotes')
        .update({ text: quote.text })
        .eq('id', quote.id)
        .select()
        .single()
      if (error) throw error
      return data as PlayerQuote
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [PLAYER_QUOTES_KEY, data.player_id] }),
  })
}

export function useDeletePlayerQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quote: { id: string; player_id: string }) => {
      const { error } = await supabase.from('player_quotes').delete().eq('id', quote.id)
      if (error) throw error
      return quote
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [PLAYER_QUOTES_KEY, data.player_id] }),
  })
}
