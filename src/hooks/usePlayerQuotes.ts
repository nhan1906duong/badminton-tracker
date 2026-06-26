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
      const { data, error } = await supabase.rpc('create_player_quote', {
        p_player_id: quote.player_id,
        p_text: quote.text,
      })
      if (error) throw error
      return data[0] as PlayerQuote
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [PLAYER_QUOTES_KEY, data.player_id] }),
  })
}

export function useUpdatePlayerQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quote: { id: string; text: string }) => {
      const { data, error } = await supabase.rpc('update_player_quote', {
        p_id: quote.id,
        p_text: quote.text,
      })
      if (error) throw error
      return data[0] as PlayerQuote
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [PLAYER_QUOTES_KEY, data.player_id] }),
  })
}

export function useDeletePlayerQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quote: { id: string; player_id: string }) => {
      const { error } = await supabase.rpc('delete_player_quote', { p_id: quote.id })
      if (error) throw error
      return quote
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [PLAYER_QUOTES_KEY, data.player_id] }),
  })
}
