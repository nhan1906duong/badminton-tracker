import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Match, MatchTeam, MatchParticipant, MatchScore, MatchWithDetails, SetScore, MatchType, Player } from '../types/database'

const MATCHES_KEY = 'matches'

export interface CreateMatchInput {
  match_type: MatchType
  played_at: string
  notes?: string
  team_a_player_ids: string[]
  team_b_player_ids: string[]
  winner_team: 'TEAM_A' | 'TEAM_B'
  scores: SetScore[]
}

export function useMatches() {
  return useQuery({
    queryKey: [MATCHES_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          teams:match_teams(*),
          participants:match_participants(*, player:players(*)),
          scores:match_scores(*)
        `)
        .order('played_at', { ascending: false })
      if (error) throw error

      return (data ?? []).map((match) => {
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
      // 1. Insert match
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          match_type: input.match_type,
          played_at: input.played_at,
          notes: input.notes || null,
        })
        .select()
        .single()
      if (matchError) throw matchError

      const matchId = (match as Match).id

      // 2. Insert teams
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
      if (!teamAId || !teamBId) {
        throw new Error('Failed to create teams')
      }

      // 3. Insert participants
      const participants = [
        ...input.team_a_player_ids.map(pid => ({ match_id: matchId, team_id: teamAId, player_id: pid })),
        ...input.team_b_player_ids.map(pid => ({ match_id: matchId, team_id: teamBId, player_id: pid })),
      ]
      const { error: partError } = await supabase.from('match_participants').insert(participants)
      if (partError) throw partError

      // 4. Insert scores
      if (input.scores.length > 0) {
        const scores = input.scores.map(s => ({
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
    onSuccess: () => qc.invalidateQueries({ queryKey: [MATCHES_KEY] }),
  })
}

export function useDeleteMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('matches').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [MATCHES_KEY] }),
  })
}
