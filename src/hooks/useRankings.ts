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
  averageWeeklyPoints: number
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

export interface PrevResult {
  session_id: string
  player_id: string
  is_winner: boolean
  total_weekly_points: number
  team_score: number
  opponent_score: number
}

// Returns a map of playerId → rankChange (positive = moved up).
// prevResults must be the per-player match rows *excluding* the last session.
// lastSessionDeltaMap holds the summed Elo delta each player earned in that last session.
export function computeRankChanges(
  rankings: Pick<PlayerRankingStats, 'playerId' | 'rating' | 'rank'>[],
  prevResults: PrevResult[],
  lastSessionDeltaMap: Map<string, number>,
): Map<string, number> {
  const prevStatsMap = new Map<string, { matchesPlayed: number; wins: number; totalWeeklyPoints: number; pointsFor: number; pointsAgainst: number }>()
  for (const r of prevResults) {
    const s = prevStatsMap.get(r.player_id) ?? { matchesPlayed: 0, wins: 0, totalWeeklyPoints: 0, pointsFor: 0, pointsAgainst: 0 }
    s.matchesPlayed += 1
    s.wins += r.is_winner ? 1 : 0
    s.totalWeeklyPoints += r.total_weekly_points
    s.pointsFor += r.team_score
    s.pointsAgainst += r.opponent_score
    prevStatsMap.set(r.player_id, s)
  }

  const prevRatingOf = (r: Pick<PlayerRankingStats, 'playerId' | 'rating'>) =>
    r.rating - (lastSessionDeltaMap.get(r.playerId) ?? 0)

  const prevSorted = [...rankings].sort((a, b) => {
    const rDiff = prevRatingOf(b) - prevRatingOf(a)
    if (rDiff !== 0) return rDiff
    const psA = prevStatsMap.get(a.playerId) ?? { matchesPlayed: 0, wins: 0, totalWeeklyPoints: 0, pointsFor: 0, pointsAgainst: 0 }
    const psB = prevStatsMap.get(b.playerId) ?? { matchesPlayed: 0, wins: 0, totalWeeklyPoints: 0, pointsFor: 0, pointsAgainst: 0 }
    const avgA = psA.matchesPlayed > 0 ? psA.totalWeeklyPoints / psA.matchesPlayed : 0
    const avgB = psB.matchesPlayed > 0 ? psB.totalWeeklyPoints / psB.matchesPlayed : 0
    if (avgB !== avgA) return avgB - avgA
    const wrA = psA.matchesPlayed > 0 ? psA.wins / psA.matchesPlayed : 0
    const wrB = psB.matchesPlayed > 0 ? psB.wins / psB.matchesPlayed : 0
    if (wrB !== wrA) return wrB - wrA
    return (psB.pointsFor - psB.pointsAgainst) - (psA.pointsFor - psA.pointsAgainst)
  })

  const prevRankMap = new Map(prevSorted.map((r, i) => [r.playerId, i + 1]))
  return new Map(rankings.map(r => [r.playerId, (prevRankMap.get(r.playerId) ?? r.rank) - r.rank]))
}

function uniquePlayerMatchResults<T extends { player_id: string; match_id: string }>(results: T[] | null | undefined): T[] {
  return Array.from(
    new Map((results ?? []).map(result => [`${result.player_id}:${result.match_id}`, result])).values()
  )
}

export function buildSessionWeeklyRankings(
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
        averageWeeklyPoints: s.matchesPlayed > 0 ? Math.round(s.weeklyPoints / s.matchesPlayed) : 0,
        wins: s.wins,
        losses: s.losses,
        matchesPlayed: s.matchesPlayed,
        pointDifference: s.pointsFor - s.pointsAgainst,
        ratingDelta: s.ratingDelta,
      }
    })
    .sort((a, b) => {
      if (b.weeklyPoints !== a.weeklyPoints) return b.weeklyPoints - a.weeklyPoints
      if (b.averageWeeklyPoints !== a.averageWeeklyPoints) return b.averageWeeklyPoints - a.averageWeeklyPoints
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

      const endedSessionIds = new Set((endedSessions ?? []).map(s => s.id))
      const uniqueResults = uniquePlayerMatchResults((results ?? []) as ResultRow[])
        .filter(r => endedSessionIds.has(r.session_id))

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

      // Compute previous rank (before the last session's contribution)
      const prevResultsForRank = lastSession?.id
        ? uniqueResults.filter(r => r.session_id !== lastSession.id)
        : uniqueResults
      const rankChangeMap = computeRankChanges(rankings, prevResultsForRank, lastSessionDeltaMap)
      rankings.forEach(r => { r.rankChange = rankChangeMap.get(r.playerId) ?? 0 })

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

export interface PlayerRankingAtMatch {
  matchIndex: number
  rank: number
  weeklyPoints: number
}

export interface PlayerRankingHistory {
  playerId: string
  name: string
  avatarUrl: string | null
  history: PlayerRankingAtMatch[]
}

export function computeSessionRankingHistory(
  matches: Array<{ id: string; status: string; played_at: string | null; teams: Array<{ is_winner: boolean }> }>,
  results: SessionResultRow[],
  players: Array<{ id: string; name: string; avatar_url: string | null }>,
): PlayerRankingHistory[] {
  const completed = matches
    .filter(m => m.status === 'COMPLETED' && m.teams.some(t => t.is_winner))
    .sort((a, b) => new Date(a.played_at ?? 0).getTime() - new Date(b.played_at ?? 0).getTime())

  const resultsByMatchId = new Map<string, SessionResultRow[]>()
  for (const r of results) {
    const arr = resultsByMatchId.get(r.match_id) ?? []
    arr.push(r)
    resultsByMatchId.set(r.match_id, arr)
  }

  const historyMap = new Map<string, PlayerRankingAtMatch[]>()
  const cumulative: SessionResultRow[] = []

  for (let i = 0; i < completed.length; i++) {
    const matchResults = resultsByMatchId.get(completed[i].id) ?? []
    cumulative.push(...matchResults)

    const rankings = buildSessionWeeklyRankings(players, cumulative)
    rankings.forEach((stat, idx) => {
      const history = historyMap.get(stat.playerId) ?? []
      history.push({ matchIndex: i + 1, rank: idx + 1, weeklyPoints: stat.weeklyPoints })
      historyMap.set(stat.playerId, history)
    })
  }

  return Array.from(historyMap.entries()).map(([playerId, history]) => {
    const p = players.find(pl => pl.id === playerId)
    return {
      playerId,
      name: p?.name ?? 'Unknown',
      avatarUrl: p?.avatar_url ?? null,
      history,
    }
  })
}

export function useSessionMatchResults(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-match-results', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_match_results')
        .select('session_id, match_id, player_id, is_winner, team_score, opponent_score, total_weekly_points, rating_delta')
        .eq('session_id', sessionId!)
      if (error) throw error
      return (data ?? []) as SessionResultRow[]
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
