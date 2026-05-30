import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
          players: playersData?.map((p) => p.player).filter(Boolean) ?? [],
        } as LeagueTeamWithPlayers
      })
    },
    enabled: !!sessionId,
  })
}

export function useCreateLeagueTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      sessionId: string
      name: string
      playerIds: string[]
    }) => {
      const { data: team, error } = await supabase
        .from('league_teams')
        .insert({ session_id: input.sessionId, name: input.name })
        .select()
        .single()
      if (error) throw error

      if (input.playerIds.length > 0) {
        const { error: pError } = await supabase
          .from('league_team_players')
          .insert(
            input.playerIds.map((pid) => ({
              league_team_id: (team as { id: string }).id,
              player_id: pid,
            }))
          )
        if (pError) throw pError
      }
      return team as { id: string; session_id: string; name: string; created_at: string }
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
      let previousPlayerIds: string[] = []

      if (input.playerIds !== undefined) {
        const { data: existingPlayers, error: existingPlayersError } = await supabase
          .from('league_team_players')
          .select('player_id')
          .eq('league_team_id', input.teamId)
        if (existingPlayersError) throw existingPlayersError

        previousPlayerIds = ((existingPlayers ?? []) as { player_id: string }[]).map((row) => row.player_id)
      }

      if (input.name !== undefined) {
        const { error } = await supabase
          .from('league_teams')
          .update({ name: input.name })
          .eq('id', input.teamId)
        if (error) throw error
      }

      if (input.playerIds !== undefined) {
        // Delete existing links, then insert new ones
        const { error: delError } = await supabase
          .from('league_team_players')
          .delete()
          .eq('league_team_id', input.teamId)
        if (delError) throw delError

        if (input.playerIds.length > 0) {
          const { error } = await supabase.from('league_team_players').insert(
            input.playerIds.map((pid) => ({
              league_team_id: input.teamId,
              player_id: pid,
            }))
          )
          if (error) throw error
        }

        type ScheduledMatch = {
          id: string
          teams: Array<{ id: string; team_label: 'TEAM_A' | 'TEAM_B' }>
          participants: Array<{ player_id: string; team_id: string }>
        }

        const { data: scheduledMatches, error: matchesError } = await supabase
          .from('matches')
          .select(`
            id,
            teams:match_teams(id, team_label),
            participants:match_participants(player_id, team_id)
          `)
          .eq('session_id', input.sessionId)
          .eq('status', 'SCHEDULED')
        if (matchesError) throw matchesError

        const previousSet = new Set(previousPlayerIds)
        const sameRoster = (playerIds: string[]) =>
          playerIds.length === previousSet.size && playerIds.every((playerId) => previousSet.has(playerId))

        for (const match of (scheduledMatches ?? []) as unknown as ScheduledMatch[]) {
          const matchTeam = match.teams.find((team) => {
            const sidePlayerIds = match.participants
              .filter((participant) => participant.team_id === team.id)
              .map((participant) => participant.player_id)
            return sameRoster(sidePlayerIds)
          })
          if (!matchTeam) continue

          const { error: deleteMatchParticipantsError } = await supabase
            .from('match_participants')
            .delete()
            .eq('team_id', matchTeam.id)
          if (deleteMatchParticipantsError) throw deleteMatchParticipantsError

          if (input.playerIds.length > 0) {
            const { error: insertMatchParticipantsError } = await supabase
              .from('match_participants')
              .insert(
                input.playerIds.map((playerId) => ({
                  match_id: match.id,
                  team_id: matchTeam.id,
                  player_id: playerId,
                }))
              )
            if (insertMatchParticipantsError) throw insertMatchParticipantsError
          }
        }
      }
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
    mutationFn: async ({ teamId, sessionId: _sessionId }: { teamId: string; sessionId: string }) => {
      const { error } = await supabase.from('league_teams').delete().eq('id', teamId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [LEAGUE_TEAMS_KEY, vars.sessionId] })
    },
  })
}
