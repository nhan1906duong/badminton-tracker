import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PlayerRankingStats } from './useRankings'

interface LeaderboardRow {
  player_id: string
  name: string
  avatar_url: string | null
  rating: number
  rank: number
  matches_played: number
  wins: number
  losses: number
  win_rate: number
  total_weekly_points: number
  avg_weekly_points: number
  points_for: number
  points_against: number
  point_difference: number
  total_rating_delta: number
  last_session_delta: number
  rank_change: number
  top_one_week_streak: number
}

function toPlayerRankingStats(row: LeaderboardRow): PlayerRankingStats {
  return {
    playerId: row.player_id,
    name: row.name,
    avatarUrl: row.avatar_url,
    rating: row.rating,
    rank: row.rank,
    matchesPlayed: Number(row.matches_played),
    wins: Number(row.wins),
    losses: Number(row.losses),
    winRate: row.win_rate,
    totalWeeklyPoints: Number(row.total_weekly_points),
    averageWeeklyPoints: row.avg_weekly_points,
    pointsFor: Number(row.points_for),
    pointsAgainst: Number(row.points_against),
    pointDifference: Number(row.point_difference),
    totalRatingDelta: row.total_rating_delta,
    lastSessionRatingDelta: row.last_session_delta,
    rankChange: row.rank_change,
    topOneWeekStreak: row.top_one_week_streak,
  }
}

/**
 * Paginated leaderboard using the get_leaderboard_page RPC.
 * Replaces usePlayerRankings() on RankingPage.
 * usePlayerRankings() is kept for SessionDetailPage and other consumers.
 */
export function useLeaderboard(pageSize = 50) {
  return useInfiniteQuery({
    queryKey: ['leaderboard'],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const { data, error } = await supabase.rpc('get_leaderboard_page', {
        p_limit: pageSize,
        p_offset: pageParam,
      })
      if (error) throw error
      const rows = ((data ?? []) as LeaderboardRow[]).map(toPlayerRankingStats)
      return { rows, nextOffset: pageParam + pageSize }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastParam) =>
      lastPage.rows.length === pageSize ? lastParam + pageSize : undefined,
    staleTime: 60_000,
  })
}
