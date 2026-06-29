import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { LeagueTeamWithPlayers, Player } from '../types/database'

const LEAGUE_TEAMS_KEY = 'league-teams'

export function useLeagueTeams(sessionId: string | undefined) {
  return useQuery({
    queryKey: [LEAGUE_TEAMS_KEY, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('league_teams')
        .select(`
          *,
          players:league_team_players(player:players(*))
        `)
        .eq('session_id', sessionId!)
        .order('created_at', { ascending: true })
      if (error) throw error

      return (data ?? []).map((t: unknown) => {
        const team = t as Record<string, unknown>
        const playersData = team.players as Array<{ player: Player }> | undefined
        return {
          ...(team as Omit<LeagueTeamWithPlayers, 'players'>),
          players: playersData?.map(p => p.player).filter(Boolean) ?? [],
        } as LeagueTeamWithPlayers
      })
    },
    enabled: !!sessionId,
  })
}

export function useCreateLeagueTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { sessionId: string; name: string; playerIds: string[] }) => {
      const { data, error } = await supabase.rpc('create_league_team', {
        p_session_id: input.sessionId,
        p_name: input.name,
        p_player_ids: input.playerIds,
      })
      if (error) throw error
      return (data as { id: string; session_id: string; name: string; created_at: string }[])[0]
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [LEAGUE_TEAMS_KEY, vars.sessionId] })
    },
  })
}

export function useUpdateLeagueTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      teamId: string
      sessionId: string
      name?: string
      playerIds?: string[]
    }) => {
      const { error } = await supabase.rpc('update_league_team', {
        p_team_id: input.teamId,
        p_session_id: input.sessionId,
        p_name: input.name ?? null,
        p_player_ids: input.playerIds ?? null,
      })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [LEAGUE_TEAMS_KEY, vars.sessionId] })
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['matches', vars.sessionId] })
    },
  })
}

export function useDeleteLeagueTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ teamId }: { teamId: string; sessionId: string }) => {
      const { error } = await supabase.rpc('delete_league_team', { p_team_id: teamId })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [LEAGUE_TEAMS_KEY, vars.sessionId] })
    },
  })
}
