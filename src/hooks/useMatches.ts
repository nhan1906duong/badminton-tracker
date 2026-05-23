import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Match, MatchTeam, MatchParticipant, MatchScore, MatchWithDetails, SetScore, MatchType, MatchStatus, Player } from '../types/database'

const MATCHES_KEY = 'matches'
const PLAYER_MATCHES_KEY = 'player-matches'

export interface CreateMatchInput {
  session_id: string
  match_type: MatchType
  played_at: string
  notes?: string
  status: MatchStatus
  queue_position?: number
  team_a_player_ids: string[]
  team_b_player_ids: string[]
  winner_team?: 'TEAM_A' | 'TEAM_B'
  scores?: SetScore[]
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          session_id: input.session_id,
          match_type: input.match_type,
          played_at: input.played_at,
          notes: input.notes || null,
          status: input.status,
          queue_position: input.queue_position ?? null,
          created_by: user.id,
        })
        .select()
        .single()
      if (matchError) throw matchError

      const matchId = (match as Match).id

      const { data: teams, error: teamsError } = await supabase
        .from('match_teams')
        .insert([
          { match_id: matchId, team_label: 'TEAM_A', is_winner: input.winner_team === 'TEAM_A' },
          { match_id: matchId, team_label: 'TEAM_B', is_winner: input.winner_team === 'TEAM_B' },
        ])
        .select()
      if (teamsError) throw teamsError


      const teamMap = new Map<string, string>()
      for (const t of (teams ?? []) as MatchTeam[]) {
        teamMap.set(t.team_label, t.id)
      }

      const teamAId = teamMap.get('TEAM_A')
      const teamBId = teamMap.get('TEAM_B')
      if (!teamAId || !teamBId) throw new Error('Failed to create teams')

      const participants = [
        ...input.team_a_player_ids.map(pid => ({ match_id: matchId, team_id: teamAId, player_id: pid })),
        ...input.team_b_player_ids.map(pid => ({ match_id: matchId, team_id: teamBId, player_id: pid })),
      ]
      const { error: partError } = await supabase.from('match_participants').insert(participants)
      if (partError) throw partError

      const scoresToInsert = input.scores?.filter(s => s.team_a_score > 0 || s.team_b_score > 0) ?? []
      if (scoresToInsert.length > 0) {
        const scores = scoresToInsert.map(s => ({
          match_id: matchId,
          set_number: s.set_number,
          team_a_score: s.team_a_score,
          team_b_score: s.team_b_score,
        }))
        const { error: scoreError } = await supabase.from('match_scores').insert(scores)
        if (scoreError) throw scoreError
      }

      return match as Match
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
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
          participants:match_participants(*, player:players(*)),
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update match basic fields
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          match_type: input.match_type,
          played_at: input.played_at,
        })
        .eq('id', input.id)
      if (matchError) throw matchError

      // Update teams winner flag
      const { error: teamAError } = await supabase
        .from('match_teams')
        .update({ is_winner: input.winner_team === 'TEAM_A' })
        .eq('match_id', input.id)
        .eq('team_label', 'TEAM_A')
      if (teamAError) throw teamAError

      const { error: teamBError } = await supabase
        .from('match_teams')
        .update({ is_winner: input.winner_team === 'TEAM_B' })
        .eq('match_id', input.id)
        .eq('team_label', 'TEAM_B')
      if (teamBError) throw teamBError

      // Replace scores: delete old, insert new
      const { error: delScoreError } = await supabase
        .from('match_scores')
        .delete()
        .eq('match_id', input.id)
      if (delScoreError) throw delScoreError

      if (input.scores.length > 0) {
        const scores = input.scores.map(s => ({
          match_id: input.id,
          set_number: s.set_number,
          team_a_score: s.team_a_score,
          team_b_score: s.team_b_score,
        }))
        const { error: scoreError } = await supabase.from('match_scores').insert(scores)
        if (scoreError) throw scoreError
      }

      return input.id
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, vars.id] })
      qc.invalidateQueries({ queryKey: [PLAYER_MATCHES_KEY] })
    },
  })
}

export function useDeleteMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Explicitly delete child rows first to avoid RLS + CASCADE ordering issues
      const { error: scoresError } = await supabase.from('match_scores').delete().eq('match_id', id)
      if (scoresError) throw scoresError

      const { error: partsError } = await supabase.from('match_participants').delete().eq('match_id', id)
      if (partsError) throw partsError

      const { error: teamsError } = await supabase.from('match_teams').delete().eq('match_id', id)
      if (teamsError) throw teamsError

      const { error } = await supabase.from('matches').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: [PLAYER_MATCHES_KEY] })
    },
  })
}

export function useStartMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'LIVE', queue_position: null })
        .eq('id', matchId)
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
      const { error: matchError } = await supabase
        .from('matches')
        .update({ status: 'COMPLETED', ended_at: new Date().toISOString() })
        .eq('id', input.id)
      if (matchError) throw matchError

      const { error: teamAError } = await supabase
        .from('match_teams')
        .update({ is_winner: input.winner_team === 'TEAM_A' })
        .eq('match_id', input.id)
        .eq('team_label', 'TEAM_A')
      if (teamAError) throw teamAError

      const { error: teamBError } = await supabase
        .from('match_teams')
        .update({ is_winner: input.winner_team === 'TEAM_B' })
        .eq('match_id', input.id)
        .eq('team_label', 'TEAM_B')
      if (teamBError) throw teamBError

      const { error: delError } = await supabase
        .from('match_scores')
        .delete()
        .eq('match_id', input.id)
      if (delError) throw delError

      const scoresToInsert = input.scores.filter(s => s.team_a_score > 0 || s.team_b_score > 0)
      if (scoresToInsert.length > 0) {
        const { error: scoreError } = await supabase.from('match_scores').insert(
          scoresToInsert.map(s => ({
            match_id: input.id,
            set_number: s.set_number,
            team_a_score: s.team_a_score,
            team_b_score: s.team_b_score,
          }))
        )
        if (scoreError) throw scoreError
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, vars.id] })
      qc.invalidateQueries({ queryKey: [PLAYER_MATCHES_KEY] })
    },
  })
}

export function useReopenMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'LIVE' })
        .eq('id', matchId)
      if (error) throw error
    },
    onSuccess: (_, matchId) => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, matchId] })
    },
  })
}

export function useReorderQueue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string; queue_position: number }[]) => {
      await Promise.all(
        updates.map(({ id, queue_position }) =>
          supabase.from('matches').update({ queue_position }).eq('id', id)
        )
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
    },
  })
}
