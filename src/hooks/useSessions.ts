import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session } from '../types/database'
import {
  teamAvgRating,
  calculateExpectedWinRate,
  calculateRatingDelta,
  calculateMatchPoints,
  SCORING_CONFIG,
} from '../lib/rating'

const SESSIONS_KEY = 'sessions'

export function useSessions() {
  return useQuery({
    queryKey: [SESSIONS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('started_at', { ascending: false })
      if (error) throw error
      return data as Session[]
    },
  })
}

export function useOpenSession() {
  return useQuery({
    queryKey: [SESSIONS_KEY, 'open'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .is('ended_at', null)
        .eq('created_by', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()
      if (error) {
        if (error.code === 'PGRST116') return null // no rows
        throw error
      }
      return data as Session
    },
  })
}

export class DuplicateTournamentError extends Error {
  constructor() {
    super('A session for this tournament already exists.')
    this.name = 'DuplicateTournamentError'
  }
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      label?: string
      started_at?: string
      bwf_tournament_id?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Guard: reject if a session with the same tournament already exists
      if (input.bwf_tournament_id) {
        const { data: existing } = await supabase
          .from('sessions')
          .select('id')
          .eq('bwf_tournament_id', input.bwf_tournament_id)
          .limit(1)
          .maybeSingle()
        if (existing) throw new DuplicateTournamentError()
      }

      // Create new session
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          label: input.label || null,
          started_at: input.started_at ?? new Date().toISOString(),
          bwf_tournament_id: input.bwf_tournament_id || null,
          created_by: user.id,
        })
        .select()
        .single()
      if (error) throw error
      return data as Session
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
    },
  })
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: [SESSIONS_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Session
    },
    enabled: !!id,
  })
}

export function useStartSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sessions')
        .update({ started_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
    },
  })
}

export function useEndSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Fetch all completed matches in this session, ordered chronologically
      type TeamRow = { id: string; team_label: string; is_winner: boolean }
      type ParticipantRow = { player_id: string; team_id: string }

      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id, played_at,
          teams:match_teams(id, team_label, is_winner),
          participants:match_participants(player_id, team_id)
        `)
        .eq('session_id', id)
        .eq('status', 'COMPLETED')
        .order('played_at', { ascending: true })
      if (matchesError) throw matchesError

      const sessionMatches = (matches ?? []) as unknown as Array<{
        id: string
        played_at: string
        teams: TeamRow[]
        participants: ParticipantRow[]
      }>

      // 2. Collect all unique player IDs in this session
      const allPlayerIds = [
        ...new Set(sessionMatches.flatMap(m => m.participants.map(p => p.player_id))),
      ]

      if (allPlayerIds.length > 0) {
        // 3. Fetch current ratings as the starting point for this session
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('id, rating')
          .in('id', allPlayerIds)
        if (playersError) throw playersError

        const ratingMap = new Map<string, number>(
          (players ?? []).map(p => [p.id, p.rating ?? SCORING_CONFIG.initialRating])
        )

        // 4. Process matches in chronological order, tracking running Elo changes
        const ratingUpdates: Array<{
          player_id: string
          match_id: string
          rating_before: number
          rating_after: number
          rating_delta: number
        }> = []

        for (const match of sessionMatches) {
          const winnerTeam = match.teams.find(t => t.is_winner)
          if (!winnerTeam) continue

          const teamARow = match.teams.find(t => t.team_label === 'TEAM_A')!
          const teamBRow = match.teams.find(t => t.team_label === 'TEAM_B')!
          const teamAParticipants = match.participants.filter(p => p.team_id === teamARow.id)
          const teamBParticipants = match.participants.filter(p => p.team_id === teamBRow.id)

          const teamARating = teamAvgRating(
            teamAParticipants.map(p => ratingMap.get(p.player_id) ?? SCORING_CONFIG.initialRating)
          )
          const teamBRating = teamAvgRating(
            teamBParticipants.map(p => ratingMap.get(p.player_id) ?? SCORING_CONFIG.initialRating)
          )

          const isTeamAWinner = winnerTeam.team_label === 'TEAM_A'
          const expectedA = calculateExpectedWinRate(teamARating, teamBRating)
          const deltaA = calculateRatingDelta(expectedA, isTeamAWinner ? 1 : 0)
          const deltaB = calculateRatingDelta(1 - expectedA, isTeamAWinner ? 0 : 1)

          for (const p of teamAParticipants) {
            const before = ratingMap.get(p.player_id) ?? SCORING_CONFIG.initialRating
            const after = before + deltaA
            ratingMap.set(p.player_id, after)
            ratingUpdates.push({ player_id: p.player_id, match_id: match.id, rating_before: before, rating_after: after, rating_delta: deltaA })
          }
          for (const p of teamBParticipants) {
            const before = ratingMap.get(p.player_id) ?? SCORING_CONFIG.initialRating
            const after = before + deltaB
            ratingMap.set(p.player_id, after)
            ratingUpdates.push({ player_id: p.player_id, match_id: match.id, rating_before: before, rating_after: after, rating_delta: deltaB })
          }
        }

        // 5. Write rating history into player_match_results rows
        const ratingHistoryResults = await Promise.all(
          ratingUpdates.map(u =>
            supabase
              .from('player_match_results')
              .update({ rating_before: u.rating_before, rating_after: u.rating_after, rating_delta: u.rating_delta })
              .eq('player_id', u.player_id)
              .eq('match_id', u.match_id)
          )
        )
        const ratingHistoryError = ratingHistoryResults.find((r) => r.error)?.error
        if (ratingHistoryError) throw ratingHistoryError

        // 6. Persist updated ratings to players table
        const playerRatingResults = await Promise.all(
          Array.from(ratingMap.entries()).map(([playerId, rating]) =>
            supabase.from('players').update({ rating }).eq('id', playerId)
          )
        )
        const playerRatingError = playerRatingResults.find((r) => r.error)?.error
        if (playerRatingError) throw playerRatingError
      }

      // 7. Mark session as ended
      const { error } = await supabase
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['player-rankings'] })
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Find all matches in this session to clean up children explicitly
      const { data: matchRows, error: listError } = await supabase
        .from('matches')
        .select('id')
        .eq('session_id', id)
      if (listError) throw listError

      const matchIds = (matchRows ?? []).map((m) => m.id)

      if (matchIds.length > 0) {
        const { error: scoresError } = await supabase
          .from('match_scores')
          .delete()
          .in('match_id', matchIds)
        if (scoresError) throw scoresError

        const { error: partsError } = await supabase
          .from('match_participants')
          .delete()
          .in('match_id', matchIds)
        if (partsError) throw partsError

        const { error: teamsError } = await supabase
          .from('match_teams')
          .delete()
          .in('match_id', matchIds)
        if (teamsError) throw teamsError

        const { error: pmrError } = await supabase
          .from('player_match_results')
          .delete()
          .in('match_id', matchIds)
        if (pmrError) throw pmrError

        const { error: matchesError } = await supabase
          .from('matches')
          .delete()
          .in('id', matchIds)
        if (matchesError) throw matchesError
      }

      const { error } = await supabase.from('sessions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
    },
  })
}

export function useClearAllData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Delete all uploaded avatars from storage
      const { data: userFiles } = await supabase.storage.from('avatars').list('users')
      const { data: playerFiles } = await supabase.storage.from('avatars').list('players')

      const toDelete: string[] = []
      if (userFiles) {
        toDelete.push(...userFiles.map(f => `users/${f.name}`))
      }
      if (playerFiles) {
        toDelete.push(...playerFiles.map(f => `players/${f.name}`))
      }
      if (toDelete.length > 0) {
        await supabase.storage.from('avatars').remove(toDelete)
      }

      // 2. Delete child tables first, then parents (cascade handles most,
      // but explicit ordering avoids relying solely on DB config)
      await supabase.from('match_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('match_participants').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('match_teams').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('player_match_results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // 3. Clear player avatars + reset ratings in DB, then delete players
      await supabase.from('players').update({ avatar_url: null, rating: 1000 }).neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // 4. Clear user profile avatars (keep profiles row, just remove avatar_url)
      await supabase.from('profiles').update({ avatar_url: null }).neq('id', '00000000-0000-0000-0000-000000000000')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

/**
 * Replays all match history from scratch to populate player_match_results and player ratings.
 * Use this once to retroactively process sessions that existed before the rating system was added,
 * or to fix ratings after data corrections.
 *
 * Algorithm:
 *   - Resets all player ratings to 1000
 *   - Processes every session in chronological order (started_at ASC)
 *   - Within each session processes matches in played_at ASC order
 *   - Elo changes are applied running (match-by-match) so ratings stay accurate throughout
 *   - Ended sessions: all fields including rating_before/after/delta are stored
 *   - Open sessions: weekly points are stored, rating columns stay null (filled when session ends)
 */
export function useRecalculateAllRatings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      type TeamRow = { id: string; team_label: string; is_winner: boolean }
      type ParticipantRow = { player_id: string; team_id: string }

      // 1. Fetch all sessions in chronological order
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, started_at, ended_at')
        .order('started_at', { ascending: true })
      if (sessionsError) throw sessionsError

      // 2. Fetch all players and reset ratings
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id')
      if (playersError) throw playersError

      const playerIds = (players ?? []).map(p => p.id)
      if (playerIds.length > 0) {
        const { error: resetError } = await supabase
          .from('players')
          .update({ rating: SCORING_CONFIG.initialRating })
          .in('id', playerIds)
        if (resetError) throw resetError
      }

      // 3. Wipe existing player_match_results (clean slate)
      await supabase
        .from('player_match_results')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      // 4. Running rating map — starts at 1000 for all players
      const ratingMap = new Map<string, number>(
        playerIds.map(id => [id, SCORING_CONFIG.initialRating])
      )

      // 5. Process sessions chronologically
      for (const session of sessions ?? []) {
        const isEnded = session.ended_at != null

        const { data: matches, error: matchesError } = await supabase
          .from('matches')
          .select(`
            id, played_at,
            teams:match_teams(id, team_label, is_winner),
            participants:match_participants(player_id, team_id)
          `)
          .eq('session_id', session.id)
          .eq('status', 'COMPLETED')
          .order('played_at', { ascending: true })
        if (matchesError) throw matchesError

        const matchList = matches ?? []
        if (matchList.length === 0) continue

        // Fetch scores for all matches in this session at once
        const { data: scores } = await supabase
          .from('match_scores')
          .select('match_id, team_a_score, team_b_score')
          .in('match_id', matchList.map(m => m.id))

        const scoreMap = new Map<string, { team_a_score: number; team_b_score: number }>()
        for (const s of scores ?? []) {
          scoreMap.set(s.match_id, { team_a_score: s.team_a_score, team_b_score: s.team_b_score })
        }

        const resultRows: object[] = []

        for (const match of matchList) {
          const teams = match.teams as unknown as TeamRow[]
          const participants = match.participants as unknown as ParticipantRow[]

          const winnerTeam = teams.find(t => t.is_winner)
          if (!winnerTeam) continue

          const teamARow = teams.find(t => t.team_label === 'TEAM_A')!
          const teamBRow = teams.find(t => t.team_label === 'TEAM_B')!
          const teamAParticipants = participants.filter(p => p.team_id === teamARow.id)
          const teamBParticipants = participants.filter(p => p.team_id === teamBRow.id)

          const teamARating = teamAvgRating(
            teamAParticipants.map(p => ratingMap.get(p.player_id) ?? SCORING_CONFIG.initialRating)
          )
          const teamBRating = teamAvgRating(
            teamBParticipants.map(p => ratingMap.get(p.player_id) ?? SCORING_CONFIG.initialRating)
          )

          const isTeamAWinner = winnerTeam.team_label === 'TEAM_A'
          const score = scoreMap.get(match.id)
          const teamAScore = score?.team_a_score ?? 0
          const teamBScore = score?.team_b_score ?? 0

          // Elo deltas (only apply for ended sessions)
          let deltaA = 0, deltaB = 0
          if (isEnded) {
            const expectedA = calculateExpectedWinRate(teamARating, teamBRating)
            deltaA = calculateRatingDelta(expectedA, isTeamAWinner ? 1 : 0)
            deltaB = calculateRatingDelta(1 - expectedA, isTeamAWinner ? 0 : 1)
          }

          const buildRow = (
            p: ParticipantRow,
            isWinner: boolean,
            myScore: number,
            oppScore: number,
            myRating: number,
            oppRating: number,
            delta: number
          ) => {
            const before = ratingMap.get(p.player_id) ?? SCORING_CONFIG.initialRating
            const breakdown = calculateMatchPoints({
              isWinner, teamScore: myScore, opponentScore: oppScore,
              teamRating: myRating, opponentTeamRating: oppRating,
            })
            return {
              player_id: p.player_id,
              match_id: match.id,
              session_id: session.id,
              is_winner: isWinner,
              team_score: myScore,
              opponent_score: oppScore,
              base_points: breakdown.basePoints,
              attendance_points: breakdown.attendancePoints,
              score_bonus: breakdown.scoreBonus,
              strength_bonus: breakdown.strengthBonus,
              total_weekly_points: breakdown.total,
              rating_before: isEnded ? before : null,
              rating_after: isEnded ? before + delta : null,
              rating_delta: isEnded ? delta : null,
            }
          }

          resultRows.push(
            ...teamAParticipants.map(p =>
              buildRow(p, isTeamAWinner, teamAScore, teamBScore, teamARating, teamBRating, deltaA)
            ),
            ...teamBParticipants.map(p =>
              buildRow(p, !isTeamAWinner, teamBScore, teamAScore, teamBRating, teamARating, deltaB)
            )
          )

          // Update running ratings (ended sessions only — open sessions don't commit Elo yet)
          if (isEnded) {
            for (const p of teamAParticipants) {
              ratingMap.set(p.player_id, (ratingMap.get(p.player_id) ?? SCORING_CONFIG.initialRating) + deltaA)
            }
            for (const p of teamBParticipants) {
              ratingMap.set(p.player_id, (ratingMap.get(p.player_id) ?? SCORING_CONFIG.initialRating) + deltaB)
            }
          }
        }

        if (resultRows.length > 0) {
          const { error: insertError } = await supabase
            .from('player_match_results')
            .insert(resultRows)
          if (insertError) throw insertError
        }
      }

      // 6. Persist final ratings (reflects all ended sessions' Elo history)
      await Promise.all(
        Array.from(ratingMap.entries()).map(([playerId, rating]) =>
          supabase.from('players').update({ rating }).eq('id', playerId)
        )
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-rankings'] })
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: [SESSIONS_KEY] })
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
  })
}
