import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSessions } from './useSessions'
import { buildSessionWeeklyRankings, type SessionWeeklyStats } from './useRankings'
import { supabase } from '../lib/supabase'
import type { Session } from '../types/database'

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
    const session = sessions.find((s) => s.id === sessionId)
    if (!session || !session.ended_at) continue

    const rankings = buildSessionWeeklyRankings(null, results)
    const playerRank = rankings.findIndex((r) => r.playerId === playerId)
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
    (a, b) =>
      new Date(b.session.started_at).getTime() -
      new Date(a.session.started_at).getTime()
  )
}

export function usePlayerAchievements(playerId: string) {
  const { data: allSessions, isLoading: sessionsLoading } = useSessions()
  const { data: allResults, isLoading: resultsLoading } = useQuery({
    queryKey: ['player-match-results-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_match_results')
        .select('session_id, match_id, player_id, is_winner, team_score, opponent_score, total_weekly_points, rating_delta')
      if (error) throw error
      return data
    },
  })

  const achievements = useMemo<PlayerAchievement[]>(
    () => computeAchievements(allSessions ?? [], allResults ?? [], playerId),
    [allSessions, allResults, playerId],
  )

  return { achievements, isLoading: sessionsLoading || resultsLoading }
}
