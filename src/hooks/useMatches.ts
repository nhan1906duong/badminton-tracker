import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Match, MatchTeam, MatchParticipant, MatchScore, MatchWithDetails, SetScore, MatchType, MatchStatus, Player } from '../types/database'
import { calculateMatchPoints, teamAvgRating, SCORING_CONFIG } from '../lib/rating'
import { generateRoundRobin } from '../lib/round-robin'

const MATCHES_KEY = 'matches'
const PLAYER_MATCHES_KEY = 'player-matches'

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
          league_round: input.league_round ?? null,
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

export function useCreateLeagueSchedule() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateLeagueScheduleInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

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
      const createdMatches: Match[] = []

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

        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            session_id: input.session_id,
            match_type: input.match_type,
            played_at: input.played_at,
            status: 'SCHEDULED',
            queue_position: index + 1,
            league_round: fixture.round,
            created_by: user.id,
          })
          .select()
          .single()
        if (matchError) throw matchError

        const matchId = (match as Match).id

        const { data: matchTeams, error: teamsError } = await supabase
          .from('match_teams')
          .insert([
            { match_id: matchId, team_label: 'TEAM_A', is_winner: false },
            { match_id: matchId, team_label: 'TEAM_B', is_winner: false },
          ])
          .select()
        if (teamsError) throw teamsError

        const teamMap = new Map<string, string>()
        for (const team of (matchTeams ?? []) as MatchTeam[]) {
          teamMap.set(team.team_label, team.id)
        }

        const teamAMatchId = teamMap.get('TEAM_A')
        const teamBMatchId = teamMap.get('TEAM_B')
        if (!teamAMatchId || !teamBMatchId) throw new Error('Failed to create match teams')

        const participants = [
          ...teamA.playerIds.map(playerId => ({ match_id: matchId, team_id: teamAMatchId, player_id: playerId })),
          ...teamB.playerIds.map(playerId => ({ match_id: matchId, team_id: teamBMatchId, player_id: playerId })),
        ]

        const { error: participantsError } = await supabase
          .from('match_participants')
          .insert(participants)
        if (participantsError) throw participantsError

        createdMatches.push(match as Match)
        existing.push({
          id: matchId,
          league_round: fixture.round,
          teams: (matchTeams ?? []) as MatchTeam[],
          participants,
        })
      }

      return createdMatches
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

export interface UpdateMatchPlayersInput {
  id: string
  team_a_player_ids: string[]
  team_b_player_ids: string[]
}

export function useUpdateMatchPlayers() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateMatchPlayersInput) => {
      const allPlayerIds = [...input.team_a_player_ids, ...input.team_b_player_ids]
      if (new Set(allPlayerIds).size !== allPlayerIds.length) {
        throw new Error('A player can only appear once in a match.')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          id, session_id, status,
          teams:match_teams(id, team_label, is_winner),
          scores:match_scores(set_number, team_a_score, team_b_score)
        `)
        .eq('id', input.id)
        .single()
      if (matchError) throw matchError

      type TeamRow = { id: string; team_label: 'TEAM_A' | 'TEAM_B'; is_winner: boolean }
      type ScoreRow = { set_number: number; team_a_score: number; team_b_score: number }

      const teams = (matchData.teams ?? []) as unknown as TeamRow[]
      const scores = (matchData.scores ?? []) as unknown as ScoreRow[]
      const teamA = teams.find(t => t.team_label === 'TEAM_A')
      const teamB = teams.find(t => t.team_label === 'TEAM_B')
      if (!teamA || !teamB) throw new Error('Match teams were not found.')

      const { error: deleteParticipantsError } = await supabase
        .from('match_participants')
        .delete()
        .eq('match_id', input.id)
      if (deleteParticipantsError) throw deleteParticipantsError

      const participantRows = [
        ...input.team_a_player_ids.map(playerId => ({
          match_id: input.id,
          team_id: teamA.id,
          player_id: playerId,
        })),
        ...input.team_b_player_ids.map(playerId => ({
          match_id: input.id,
          team_id: teamB.id,
          player_id: playerId,
        })),
      ]

      const { error: insertParticipantsError } = await supabase
        .from('match_participants')
        .insert(participantRows)
      if (insertParticipantsError) throw insertParticipantsError

      const { error: deleteResultsError } = await supabase
        .from('player_match_results')
        .delete()
        .eq('match_id', input.id)
      if (deleteResultsError) throw deleteResultsError

      const winnerTeam = teams.find(t => t.is_winner)?.team_label
      const score = [...scores].sort((a, b) => a.set_number - b.set_number)[0]
      if (matchData.status === 'COMPLETED' && winnerTeam && score) {
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('id, rating')
          .in('id', allPlayerIds)
        if (playersError) throw playersError

        const ratingMap = new Map(
          ((players ?? []) as { id: string; rating: number | null }[])
            .map(p => [p.id, p.rating ?? SCORING_CONFIG.initialRating])
        )
        const ratingOf = (playerId: string) => ratingMap.get(playerId) ?? SCORING_CONFIG.initialRating
        const teamARating = teamAvgRating(input.team_a_player_ids.map(ratingOf))
        const teamBRating = teamAvgRating(input.team_b_player_ids.map(ratingOf))
        const isTeamAWinner = winnerTeam === 'TEAM_A'

        const buildResultRow = (
          playerId: string,
          isWinner: boolean,
          teamScore: number,
          opponentScore: number,
          teamRating: number,
          opponentTeamRating: number
        ) => {
          const breakdown = calculateMatchPoints({
            isWinner,
            teamScore,
            opponentScore,
            teamRating,
            opponentTeamRating,
          })

          return {
            player_id: playerId,
            match_id: input.id,
            session_id: matchData.session_id as string,
            is_winner: isWinner,
            team_score: teamScore,
            opponent_score: opponentScore,
            base_points: breakdown.basePoints,
            attendance_points: breakdown.attendancePoints,
            score_bonus: breakdown.scoreBonus,
            strength_bonus: breakdown.strengthBonus,
            total_weekly_points: breakdown.total,
          }
        }

        const resultRows = [
          ...input.team_a_player_ids.map(playerId =>
            buildResultRow(
              playerId,
              isTeamAWinner,
              score.team_a_score,
              score.team_b_score,
              teamARating,
              teamBRating
            )
          ),
          ...input.team_b_player_ids.map(playerId =>
            buildResultRow(
              playerId,
              !isTeamAWinner,
              score.team_b_score,
              score.team_a_score,
              teamBRating,
              teamARating
            )
          ),
        ]

        const { error: insertResultsError } = await supabase
          .from('player_match_results')
          .insert(resultRows)
        if (insertResultsError) throw insertResultsError
      }

      return input.id
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, vars.id] })
      qc.invalidateQueries({ queryKey: [PLAYER_MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: ['player-rankings'] })
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
        .update({ status: 'LIVE', queue_position: null, played_at: new Date().toISOString() })
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
      // 1. Mark match COMPLETED
      const { error: matchError } = await supabase
        .from('matches')
        .update({ status: 'COMPLETED', ended_at: new Date().toISOString() })
        .eq('id', input.id)
      if (matchError) throw matchError

      // 2. Update winner flags
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

      // 3. Replace scores
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

      // 4. Fetch match with participants + current player ratings for weekly points
      const { data: matchData, error: fetchError } = await supabase
        .from('matches')
        .select(`
          id, session_id,
          teams:match_teams(id, team_label),
          participants:match_participants(player_id, team_id, player:players(id, rating))
        `)
        .eq('id', input.id)
        .single()
      if (fetchError) throw fetchError

      type TeamRow = { id: string; team_label: string }
      type ParticipantRow = { player_id: string; team_id: string; player: { id: string; rating: number } }

      const teams = matchData.teams as unknown as TeamRow[]
      const participants = matchData.participants as unknown as ParticipantRow[]

      const teamARow = teams.find(t => t.team_label === 'TEAM_A')!
      const teamBRow = teams.find(t => t.team_label === 'TEAM_B')!

      const teamAParticipants = participants.filter(p => p.team_id === teamARow.id)
      const teamBParticipants = participants.filter(p => p.team_id === teamBRow.id)

      const teamARating = teamAvgRating(
        teamAParticipants.map(p => p.player?.rating ?? SCORING_CONFIG.initialRating)
      )
      const teamBRating = teamAvgRating(
        teamBParticipants.map(p => p.player?.rating ?? SCORING_CONFIG.initialRating)
      )

      // Use the first score set (single-set matches)
      const score = scoresToInsert[0] ?? input.scores[0]
      const teamAScore = score?.team_a_score ?? 0
      const teamBScore = score?.team_b_score ?? 0
      const isTeamAWinner = input.winner_team === 'TEAM_A'

      // 5. Calculate weekly points for each player and upsert player_match_results
      const buildRow = (p: ParticipantRow, isWinner: boolean, myScore: number, oppScore: number, myRating: number, oppRating: number) => {
        const breakdown = calculateMatchPoints({
          isWinner,
          teamScore: myScore,
          opponentScore: oppScore,
          teamRating: myRating,
          opponentTeamRating: oppRating,
        })
        return {
          player_id: p.player_id,
          match_id: input.id,
          session_id: matchData.session_id as string,
          is_winner: isWinner,
          team_score: myScore,
          opponent_score: oppScore,
          base_points: breakdown.basePoints,
          attendance_points: breakdown.attendancePoints,
          score_bonus: breakdown.scoreBonus,
          strength_bonus: breakdown.strengthBonus,
          total_weekly_points: breakdown.total,
        }
      }

      const rows = [
        ...teamAParticipants.map(p =>
          buildRow(p, isTeamAWinner, teamAScore, teamBScore, teamARating, teamBRating)
        ),
        ...teamBParticipants.map(p =>
          buildRow(p, !isTeamAWinner, teamBScore, teamAScore, teamBRating, teamARating)
        ),
      ]

      const { error: upsertError } = await supabase
        .from('player_match_results')
        .upsert(rows, { onConflict: 'player_id,match_id' })
      if (upsertError) throw upsertError
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, vars.id] })
      qc.invalidateQueries({ queryKey: [PLAYER_MATCHES_KEY] })
      qc.invalidateQueries({ queryKey: ['player-rankings'] })
    },
  })
}

export function useEndMatchNoWinner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; scores: SetScore[] }) => {
      const { error: matchError } = await supabase
        .from('matches')
        .update({ status: 'COMPLETED', ended_at: new Date().toISOString() })
        .eq('id', input.id)
      if (matchError) throw matchError

      const { error: teamsError } = await supabase
        .from('match_teams')
        .update({ is_winner: false })
        .eq('match_id', input.id)
      if (teamsError) throw teamsError

      const { error: deleteResultsError } = await supabase
        .from('player_match_results')
        .delete()
        .eq('match_id', input.id)
      if (deleteResultsError) throw deleteResultsError

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
      qc.invalidateQueries({ queryKey: ['player-rankings'] })
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
