import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Match, MatchTeam, MatchParticipant, MatchScore, MatchWithDetails, SetScore, MatchType, MatchStatus, Player } from '../types/database'
import { generateRoundRobin } from '../lib/round-robin'

const MATCHES_KEY = 'matches'
const PLAYER_MATCHES_KEY = 'player-matches'
export const PLAYER_SESSION_STATS_KEY = 'player-session-stats'
export const LEADERBOARD_KEY = 'leaderboard'


export interface CreateMatchInput {
  session_id: string
  match_type: MatchType
  played_at: string
  notes?: string
  status: MatchStatus
  queue_position?: number
  league_round?: number
  team_a_player_ids: string[]
  team_b_player_ids: string[]
  winner_team?: 'TEAM_A' | 'TEAM_B'
  scores?: SetScore[]
}

export interface CreateLeagueScheduleInput {
  session_id: string
  match_type: MatchType
  total_rounds: number
  played_at: string
  teams: Array<{
    id: string
    playerIds: string[]
  }>
}

export function useMatches(sessionId?: string) {
  return useQuery({
    queryKey: [MATCHES_KEY, sessionId],
    queryFn: async () => {
      let query = supabase
        .from('matches')
        .select(`
          *,
          teams:match_teams(*),
          participants:match_participants(*, player:players(*)),
          scores:match_scores(*)
        `)
        .order('played_at', { ascending: false })

      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { data, error } = await query
      if (error) throw error

      return (data ?? []).filter((match: unknown) => {
        const m = match as Record<string, unknown>
        return m.session_id != null
      }).map((match) => {
        const m = match as unknown as Record<string, unknown>
        return {
          ...(m as unknown as Match),
          teams: (m.teams ?? []) as MatchTeam[],
          participants: (m.participants ?? []) as (MatchParticipant & { player: Player })[],
          scores: ((m.scores ?? []) as MatchScore[]).sort((a, b) => a.set_number - b.set_number),
        } as MatchWithDetails
      })
    },
  })
}

export function useCreateMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateMatchInput) => {
      const { data, error } = await supabase.rpc('create_match', {
        p_session_id: input.session_id,
        p_match_type: input.match_type,
        p_played_at: input.played_at,
        p_notes: input.notes || null,
        p_status: input.status,
        p_queue_position: input.queue_position ?? null,
        p_league_round: input.league_round ?? null,
        p_team_a_player_ids: input.team_a_player_ids,
        p_team_b_player_ids: input.team_b_player_ids,
        p_winner_team: input.winner_team || null,
        p_scores: input.scores?.filter(s => s.team_a_score > 0 || s.team_b_score > 0) ?? null,
      })
      if (error) throw error
      return data[0] as Match
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, vars.session_id] })
      qc.invalidateQueries({ queryKey: [PLAYER_MATCHES_KEY] })
    },
  })
}

export function useCreateLeagueSchedule() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateLeagueScheduleInput) => {
      const { data: existingMatches, error: existingError } = await supabase
        .from('matches')
        .select(`
          id, league_round,
          teams:match_teams(id, team_label),
          participants:match_participants(player_id, team_id)
        `)
        .eq('session_id', input.session_id)
      if (existingError) throw existingError

      type ExistingMatch = {
        id: string
        league_round: number | null
        teams: Array<{ id: string; team_label: 'TEAM_A' | 'TEAM_B' }>
        participants: Array<{ player_id: string; team_id: string }>
      }

      const fixtureMatchesTeam = (match: ExistingMatch, teamAIds: Set<string>, teamBIds: Set<string>) => {
        const teamAMatch = match.teams.find(team => team.team_label === 'TEAM_A')
        const teamBMatch = match.teams.find(team => team.team_label === 'TEAM_B')
        if (!teamAMatch || !teamBMatch) return false

        const aPlayers = match.participants
          .filter(player => player.team_id === teamAMatch.id)
          .map(player => player.player_id)
        const bPlayers = match.participants
          .filter(player => player.team_id === teamBMatch.id)
          .map(player => player.player_id)

        const aIsTeamA = aPlayers.every(id => teamAIds.has(id)) && aPlayers.length === teamAIds.size
        const aIsTeamB = aPlayers.every(id => teamBIds.has(id)) && aPlayers.length === teamBIds.size
        const bIsTeamA = bPlayers.every(id => teamAIds.has(id)) && bPlayers.length === teamAIds.size
        const bIsTeamB = bPlayers.every(id => teamBIds.has(id)) && bPlayers.length === teamBIds.size

        return (aIsTeamA && bIsTeamB) || (aIsTeamB && bIsTeamA)
      }

      const existing = (existingMatches ?? []) as unknown as ExistingMatch[]

      const fixtures = generateRoundRobin(input.teams.length, input.total_rounds)
      const fixturesToCreate: Array<{
        teamAPlayerIds: string[]
        teamBPlayerIds: string[]
        round: number
        queuePosition: number
      }> = []

      for (let index = 0; index < fixtures.length; index++) {
        const fixture = fixtures[index]
        const teamA = input.teams[fixture.teamAIndex]
        const teamB = input.teams[fixture.teamBIndex]
        if (!teamA || !teamB) continue

        const teamAIds = new Set(teamA.playerIds)
        const teamBIds = new Set(teamB.playerIds)
        const alreadyExists = existing.some(match =>
          match.league_round === fixture.round && fixtureMatchesTeam(match, teamAIds, teamBIds)
        )
        if (alreadyExists) continue

        fixturesToCreate.push({
          teamAPlayerIds: teamA.playerIds,
          teamBPlayerIds: teamB.playerIds,
          round: fixture.round,
          queuePosition: index + 1,
        })
      }

      if (fixturesToCreate.length > 0) {
        const { error } = await supabase.rpc('create_league_schedule', {
          p_session_id: input.session_id,
          p_match_type: input.match_type,
          p_played_at: input.played_at,
          p_fixtures: fixturesToCreate,
        })
        if (error) throw error
      }

      return []
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, vars.session_id] })
      qc.invalidateQueries({ queryKey: [PLAYER_MATCHES_KEY] })
    },
  })
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: [MATCHES_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          teams:match_teams(*),
          participants:match_participants(*, player:players(*, active_racket:player_rackets!players_active_racket_id_fkey(mascot_id))),
          scores:match_scores(*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error

      const m = data as unknown as Record<string, unknown>
      return {
        ...(m as unknown as Match),
        teams: (m.teams ?? []) as MatchTeam[],
        participants: (m.participants ?? []) as (MatchParticipant & { player: Player })[],
        scores: ((m.scores ?? []) as MatchScore[]).sort((a, b) => a.set_number - b.set_number),
      } as MatchWithDetails
    },
    enabled: !!id,
  })
}

export function useUpdateMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      match_type: MatchType
      played_at: string
      winner_team: 'TEAM_A' | 'TEAM_B'
      scores: SetScore[]
    }) => {
      const { error } = await supabase.rpc('update_match', {
        p_id: input.id,
        p_match_type: input.match_type,
        p_played_at: input.played_at,
        p_winner_team: input.winner_team,
        p_scores: input.scores,
      })
      if (error) throw error
      return input.id
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, vars.id] })
      qc.invalidateQueries({ queryKey: [PLAYER_MATCHES_KEY] })
    },
  })
}

export interface UpdateMatchPlayersInput {
  id: string
  team_a_player_ids: string[]
  team_b_player_ids: string[]
}

export function useUpdateMatchPlayers() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateMatchPlayersInput) => {
      const { error } = await supabase.rpc('update_match_players', {
        p_id: input.id,
        p_team_a_player_ids: input.team_a_player_ids,
        p_team_b_player_ids: input.team_b_player_ids,
      })
      if (error) throw error
      return input.id
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, vars.id] })
      qc.invalidateQueries({ queryKey: [PLAYER_MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: ['player-rankings'] })
      qc.invalidateQueries({ queryKey: [PLAYER_SESSION_STATS_KEY] })
      qc.invalidateQueries({ queryKey: [LEADERBOARD_KEY] })
    },
  })
}

export function useDeleteMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, sessionId: _sessionId }: { id: string; sessionId?: string }) => {
      const { error } = await supabase.rpc('delete_match', { p_match_id: id })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      if (vars.sessionId) {
        qc.invalidateQueries({ queryKey: [MATCHES_KEY, vars.sessionId] })
      } else {
        qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      }
      qc.invalidateQueries({ queryKey: [PLAYER_MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: ['player-rankings'] })
      qc.invalidateQueries({ queryKey: [PLAYER_SESSION_STATS_KEY] })
      qc.invalidateQueries({ queryKey: [LEADERBOARD_KEY] })
    },
  })
}

export function useStartMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase.rpc('start_match', { p_match_id: matchId })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
    },
  })
}

export interface RecordResultInput {
  id: string
  winner_team: 'TEAM_A' | 'TEAM_B'
  scores: SetScore[]
}

export function useRecordResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RecordResultInput) => {
      const { error } = await supabase.rpc('record_result', {
        p_id: input.id,
        p_winner_team: input.winner_team,
        p_scores: input.scores,
      })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, vars.id] })
      qc.invalidateQueries({ queryKey: [PLAYER_MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: ['player-rankings'] })
      qc.invalidateQueries({ queryKey: [PLAYER_SESSION_STATS_KEY] })
      qc.invalidateQueries({ queryKey: [LEADERBOARD_KEY] })
    },
  })
}

export function useEndMatchNoWinner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; scores: SetScore[] }) => {
      const { error } = await supabase.rpc('end_match_no_winner', {
        p_id: input.id,
        p_scores: input.scores,
      })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, vars.id] })
      qc.invalidateQueries({ queryKey: [PLAYER_MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: ['player-rankings'] })
      qc.invalidateQueries({ queryKey: [PLAYER_SESSION_STATS_KEY] })
      qc.invalidateQueries({ queryKey: [LEADERBOARD_KEY] })
    },
  })
}

export function useReopenMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase.rpc('reopen_match', { p_match_id: matchId })
      if (error) throw error
    },
    onSuccess: (_, matchId) => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, matchId] })
      qc.invalidateQueries({ queryKey: ['player-rankings'] })
      qc.invalidateQueries({ queryKey: [PLAYER_SESSION_STATS_KEY] })
      qc.invalidateQueries({ queryKey: [LEADERBOARD_KEY] })
    },
  })
}

export function useReorderQueue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string; queue_position: number }[]) => {
      const { error } = await supabase.rpc('reorder_queue', { p_updates: updates })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
    },
  })
}
