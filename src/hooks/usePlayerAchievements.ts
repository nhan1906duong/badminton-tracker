import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session } from '../types/database'
import { buildSessionWeeklyRankings, type SessionWeeklyStats } from './useRankings'

export type AchievementType = 'win' | 'runner_up'

export interface PlayerAchievement {
  session: Session
  type: AchievementType
  wins: number
  matchesPlayed: number
}

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

function isGenuineTie(top: SessionWeeklyStats, second: SessionWeeklyStats): boolean {
  return (
    second.weeklyPoints === top.weeklyPoints &&
    second.averageWeeklyPoints === top.averageWeeklyPoints &&
    second.wins === top.wins &&
    second.pointDifference === top.pointDifference
  )
}

export function computeAchievements(
  sessions: Session[],
  allResults: ResultRow[],
  playerId: string,
): PlayerAchievement[] {
  if (!sessions.length || !allResults.length || !playerId) return []

  const sessionResultsMap = new Map<string, ResultRow[]>()
  for (const r of allResults) {
    const list = sessionResultsMap.get(r.session_id) ?? []
    list.push(r)
    sessionResultsMap.set(r.session_id, list)
  }

  const result: PlayerAchievement[] = []

  for (const [sessionId, results] of sessionResultsMap) {
    const session = sessions.find(s => s.id === sessionId)
    if (!session || !session.ended_at) continue

    const rankings = buildSessionWeeklyRankings(null, results)
    const playerRank = rankings.findIndex(r => r.playerId === playerId)
    if (playerRank === -1) continue

    const rank = playerRank + 1
    if (rank > 2) continue

    if (rank === 1 && rankings[1] && isGenuineTie(rankings[0], rankings[1])) continue

    const stats = rankings[playerRank]
    result.push({
      session,
      type: rank === 1 ? 'win' : 'runner_up',
      wins: stats.wins,
      matchesPlayed: stats.matchesPlayed,
    })
  }

  return result.sort(
    (a, b) => new Date(b.session.started_at).getTime() - new Date(a.session.started_at).getTime(),
  )
}

export function usePlayerAchievements(playerId: string) {
  return useQuery({
    queryKey: ['player-achievements', playerId],
    enabled: !!playerId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // Step 1: sessions where this player finished rank 1 or 2 (ended sessions only)
      const { data: myStats, error: myError } = await supabase
        .from('player_session_stats')
        .select(`
          session_rank,
          total_matches,
          total_wins,
          session:sessions!session_id(
            id, label, started_at, ended_at, type,
            bwf_tournament_id, league_match_type, league_total_rounds, created_at
          )
        `)
        .eq('player_id', playerId)
        .lte('session_rank', 2)
      if (myError) throw myError

      const topRows = (myStats ?? []).filter(
        r => (r.session as unknown as Session)?.ended_at != null,
      )
      if (!topRows.length) return []

      // Step 2: for sessions where rank = 1, check for genuine ties (another player sharing rank 1)
      const rank1SessionIds = topRows
        .filter(r => r.session_rank === 1)
        .map(r => (r.session as unknown as Session).id)

      const tiedSessions = new Set<string>()
      if (rank1SessionIds.length > 0) {
        const { data: others } = await supabase
          .from('player_session_stats')
          .select('session_id')
          .in('session_id', rank1SessionIds)
          .eq('session_rank', 1)
          .neq('player_id', playerId)
        for (const row of others ?? []) {
          tiedSessions.add(row.session_id)
        }
      }

      return topRows
        .map(r => {
          const session = r.session as unknown as Session
          const isTied = r.session_rank === 1 && tiedSessions.has(session.id)
          if (isTied) return null
          return {
            session,
            type: r.session_rank === 1 ? 'win' : 'runner_up',
            wins: r.total_wins,
            matchesPlayed: r.total_matches,
          } satisfies PlayerAchievement
        })
        .filter((a): a is PlayerAchievement => a !== null)
        .sort(
          (a, b) =>
            new Date(b.session.started_at).getTime() - new Date(a.session.started_at).getTime(),
        )
    },
  })
}
