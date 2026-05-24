import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

async function fetchAll<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`)
  return (data ?? []) as T[]
}

export function useBackupData() {
  return useMutation({
    mutationFn: async () => {
      const [
        players,
        sessions,
        matches,
        match_teams,
        match_participants,
        match_scores,
        player_match_results,
      ] = await Promise.all([
        fetchAll('players'),
        fetchAll('sessions'),
        fetchAll('matches'),
        fetchAll('match_teams'),
        fetchAll('match_participants'),
        fetchAll('match_scores'),
        fetchAll('player_match_results'),
      ])

      const payload = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        data: {
          players,
          sessions,
          matches,
          match_teams,
          match_participants,
          match_scores,
          player_match_results,
        },
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `badminton-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}
