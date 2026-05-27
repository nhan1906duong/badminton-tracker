import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { calculateCurrentTopOneWeekStreaks } from '../lib/weekly-streak'

export interface PlayerRankingStats {
  playerId: string
  name: string
  avatarUrl: string | null
  rating: number
  matchesPlayed: number
  wins: number
  losses: number
  winRate: number
  totalWeeklyPoints: number
  averageWeeklyPoints: number
  pointsFor: number
  pointsAgainst: number
  pointDifference: number
  totalRatingDelta: number
  lastSessionRatingDelta: number  // Elo change from the most recently ended session
  rankChange: number              // positive = moved up, negative = moved down, 0 = no change
  rank: number
  topOneWeekStreak: number
}

export interface SessionWeeklyStats {
  playerId: string
  name: string
  avatarUrl: string | null
  weeklyPoints: number
  wins: number
  losses: number
  matchesPlayed: number
  pointDifference: number
  ratingDelta: number
}

interface PlayerRow {
  id: string
  name: string
  avatar_url: string | null
}

interface SessionResultRow {
  session_id: string
  match_id: string
  player_id: string
  is_winner: boolean
  team_score: number
  opponent_score: number
  total_weekly_points: number
  rating_delta: number | null
}

export interface SessionLeaderboard {
  rankings: SessionWeeklyStats[]
  leader: SessionWeeklyStats | undefined
}

function uniquePlayerMatchResults<T extends { player_id: string; match_id: string }>(results: T[] | null | undefined): T[] {
  return Array.from(
    new Map((results ?? []).map(result => [`${result.player_id}:${result.match_id}`, result])).values()
  )
}

function buildSessionWeeklyRankings(
  players: PlayerRow[] | null | undefined,
  results: SessionResultRow[] | null | undefined
): SessionWeeklyStats[] {
  const playerMap = new Map((players ?? []).map(p => [p.id, p]))

  const statsMap = new Map<string, {
    weeklyPoints: number; wins: number; losses: number
    matchesPlayed: number; pointsFor: number; pointsAgainst: number; ratingDelta: number
  }>()

  for (const r of uniquePlayerMatchResults(results)) {
    const s = statsMap.get(r.player_id) ?? {
      weeklyPoints: 0, wins: 0, losses: 0,
      matchesPlayed: 0, pointsFor: 0, pointsAgainst: 0, ratingDelta: 0,
    }
    s.matchesPlayed += 1
    s.wins += r.is_winner ? 1 : 0
    s.losses += r.is_winner ? 0 : 1
    s.weeklyPoints += r.total_weekly_points
    s.pointsFor += r.team_score
    s.pointsAgainst += r.opponent_score
    s.ratingDelta += r.rating_delta ?? 0
    statsMap.set(r.player_id, s)
  }

  return Array.from(statsMap.entries())
    .map(([playerId, s]) => {
      const p = playerMap.get(playerId)
      return {
        playerId,
        name: p?.name ?? 'Unknown',
        avatarUrl: p?.avatar_url ?? null,
        weeklyPoints: s.weeklyPoints,
        wins: s.wins,
        losses: s.losses,
        matchesPlayed: s.matchesPlayed,
        pointDifference: s.pointsFor - s.pointsAgainst,
        ratingDelta: s.ratingDelta,
      }
    })
    .sort((a, b) => {
      if (b.weeklyPoints !== a.weeklyPoints) return b.weeklyPoints - a.weeklyPoints
      if (b.wins !== a.wins) return b.wins - a.wins
      if (b.pointDifference !== a.pointDifference) return b.pointDifference - a.pointDifference
      return a.name.localeCompare(b.name)
    })
}

export function usePlayerRankings() {
  return useQuery({
    queryKey: ['player-rankings'],
    queryFn: async () => {
      // Fetch players, all-time match results, and last ended session in parallel
      const [
        { data: players, error: playersError },
        { data: results, error: resultsError },
        { data: lastSession },
        { data: endedSessions, error: endedSessionsError },
      ] = await Promise.all([
        supabase
          .from('players')
          .select('id, name, avatar_url, rating'),
        supabase
          .from('player_match_results')
          .select('session_id, match_id, player_id, is_winner, team_score, opponent_score, total_weekly_points, rating_delta'),
        supabase
          .from('sessions')
          .select('id')
          .not('ended_at', 'is', null)
          .order('ended_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('sessions')
          .select('id, started_at, ended_at')
          .not('ended_at', 'is', null),
      ])

      if (playersError) throw playersError
      if (resultsError) throw resultsError
      if (endedSessionsError) throw endedSessionsError

      type ResultRow = {
        session_id: string
        match_id: string
        player_id: string
        is_winner: boolean
        team_score: number
        opponent_score: number
        total_weekly_points: number
        rating_delta: number | null
      }

      // Aggregate all-time stats per player
      const statsMap = new Map<string, {
        matchesPlayed: number; wins: number; losses: number
        totalWeeklyPoints: number; pointsFor: number; pointsAgainst: number; totalRatingDelta: number
      }>()

      const uniqueResults = uniquePlayerMatchResults((results ?? []) as ResultRow[])

      for (const r of uniqueResults) {
        const s = statsMap.get(r.player_id) ?? {
          matchesPlayed: 0, wins: 0, losses: 0,
          totalWeeklyPoints: 0, pointsFor: 0, pointsAgainst: 0, totalRatingDelta: 0,
        }
        s.matchesPlayed += 1
        s.wins += r.is_winner ? 1 : 0
        s.losses += r.is_winner ? 0 : 1
        s.totalWeeklyPoints += r.total_weekly_points
        s.pointsFor += r.team_score
        s.pointsAgainst += r.opponent_score
        s.totalRatingDelta += r.rating_delta ?? 0
        statsMap.set(r.player_id, s)
      }

      // Fetch per-player Elo delta for the most recently ended session
      const lastSessionDeltaMap = new Map<string, number>()
      if (lastSession?.id) {
        const { data: lsd } = await supabase
          .from('player_match_results')
          .select('match_id, player_id, rating_delta')
          .eq('session_id', lastSession.id)
          .not('rating_delta', 'is', null)

        for (const r of uniquePlayerMatchResults((lsd ?? []) as { match_id: string; player_id: string; rating_delta: number }[])) {
          lastSessionDeltaMap.set(r.player_id, (lastSessionDeltaMap.get(r.player_id) ?? 0) + r.rating_delta)
        }
      }

      const topOneWeekStreakMap = calculateCurrentTopOneWeekStreaks(
        endedSessions as { id: string; started_at: string; ended_at: string | null }[] | null,
        uniqueResults,
        (players ?? []).map(p => ({ id: p.id, name: p.name }))
      )

      // Build rankings
      const rankings: PlayerRankingStats[] = (players ?? []).map(p => {
        const s = statsMap.get(p.id) ?? {
          matchesPlayed: 0, wins: 0, losses: 0,
          totalWeeklyPoints: 0, pointsFor: 0, pointsAgainst: 0, totalRatingDelta: 0,
        }
        return {
          playerId: p.id,
          name: p.name,
          avatarUrl: p.avatar_url ?? null,
          rating: p.rating ?? 1000,
          matchesPlayed: s.matchesPlayed,
          wins: s.wins,
          losses: s.losses,
          winRate: s.matchesPlayed > 0 ? s.wins / s.matchesPlayed : 0,
          totalWeeklyPoints: s.totalWeeklyPoints,
          averageWeeklyPoints: s.matchesPlayed > 0 ? s.totalWeeklyPoints / s.matchesPlayed : 0,
          pointsFor: s.pointsFor,
          pointsAgainst: s.pointsAgainst,
          pointDifference: s.pointsFor - s.pointsAgainst,
          totalRatingDelta: s.totalRatingDelta,
          lastSessionRatingDelta: lastSessionDeltaMap.get(p.id) ?? 0,
          rankChange: 0,
          rank: 0,
          topOneWeekStreak: topOneWeekStreakMap.get(p.id) ?? 0,
        }
      })

      // Sort by primary ranking order
      rankings.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating
        if (b.averageWeeklyPoints !== a.averageWeeklyPoints) return b.averageWeeklyPoints - a.averageWeeklyPoints
        if (b.winRate !== a.winRate) return b.winRate - a.winRate
        return b.pointDifference - a.pointDifference
      })
      rankings.forEach((r, i) => { r.rank = i + 1 })

      // Compute previous rank (before the last session's Elo changes)
      const prevRatingOf = (r: PlayerRankingStats) => r.rating - (lastSessionDeltaMap.get(r.playerId) ?? 0)
      const prevSorted = [...rankings].sort((a, b) => prevRatingOf(b) - prevRatingOf(a))
      const prevRankMap = new Map(prevSorted.map((r, i) => [r.playerId, i + 1]))

      // rankChange: positive = moved up (e.g. was 3, now 1 → +2)
      rankings.forEach(r => {
        const prev = prevRankMap.get(r.playerId) ?? r.rank
        r.rankChange = prev - r.rank
      })

      return rankings
    },
  })
}

export function useCompletedMatchCount() {
  return useQuery({
    queryKey: ['completed-match-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_match_results')
        .select('match_id')

      if (error) throw error

      return new Set((data ?? []).map(r => r.match_id)).size
    },
  })
}

export function useSessionWeeklyRankings(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['player-rankings', 'session', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const [{ data: players, error: playersError }, { data: results, error: resultsError }] =
        await Promise.all([
          supabase.from('players').select('id, name, avatar_url'),
          supabase
            .from('player_match_results')
            .select('match_id, player_id, is_winner, team_score, opponent_score, total_weekly_points, rating_delta')
            .eq('session_id', sessionId!),
        ])

      if (playersError) throw playersError
      if (resultsError) throw resultsError

      return buildSessionWeeklyRankings(
        players as PlayerRow[] | null,
        (results ?? []).map(r => ({ ...(r as Omit<SessionResultRow, 'session_id'>), session_id: sessionId! }))
      )
    },
  })
}

export function useSessionLeaderboard(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['player-rankings', 'session-leaderboard', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const [{ data: players, error: playersError }, { data: results, error: resultsError }] =
        await Promise.all([
          supabase.from('players').select('id, name, avatar_url'),
          supabase
            .from('player_match_results')
            .select('session_id, match_id, player_id, is_winner, team_score, opponent_score, total_weekly_points, rating_delta')
            .eq('session_id', sessionId!),
        ])

      if (playersError) throw playersError
      if (resultsError) throw resultsError

      const rankings = buildSessionWeeklyRankings(players as PlayerRow[] | null, results as SessionResultRow[] | null)
      return { rankings, leader: rankings[0] } satisfies SessionLeaderboard
    },
  })
}

export function useSessionLeaderboards() {
  return useQuery({
    queryKey: ['player-rankings', 'session-leaderboards'],
    queryFn: async () => {
      const [{ data: players, error: playersError }, { data: results, error: resultsError }] =
        await Promise.all([
          supabase.from('players').select('id, name, avatar_url'),
          supabase
            .from('player_match_results')
            .select('session_id, match_id, player_id, is_winner, team_score, opponent_score, total_weekly_points, rating_delta'),
        ])

      if (playersError) throw playersError
      if (resultsError) throw resultsError

      const resultsBySession = new Map<string, SessionResultRow[]>()
      for (const result of (results ?? []) as SessionResultRow[]) {
        const sessionResults = resultsBySession.get(result.session_id) ?? []
        sessionResults.push(result)
        resultsBySession.set(result.session_id, sessionResults)
      }

      const leaderboards = new Map<string, SessionLeaderboard>()
      for (const [sessionId, sessionResults] of resultsBySession) {
        const rankings = buildSessionWeeklyRankings(players as PlayerRow[] | null, sessionResults)
        leaderboards.set(sessionId, { rankings, leader: rankings[0] })
      }

      return leaderboards
    },
  })
}
