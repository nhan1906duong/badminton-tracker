import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PlayerRankingStats } from './useRankings'

/**
 * Fetches a single player's all-time ranking from player_all_time_stats.
 * O(1) read by player_id — no full leaderboard scan needed.
 */
export function usePlayerRankingSummary(playerId: string) {
  return useQuery({
    queryKey: ['player-ranking-summary', playerId],
    enabled: !!playerId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_all_time_stats')
        .select(`
          all_time_rank,
          matches_played,
          wins,
          losses,
          win_rate,
          total_weekly_points,
          avg_weekly_points,
          points_for,
          points_against,
          point_difference,
          total_rating_delta,
          last_session_delta,
          rank_change,
          top_one_week_streak,
          player:players!player_id(id, name, avatar_url, rating)
        `)
        .eq('player_id', playerId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      const row = data as unknown as {
        all_time_rank: number
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
        player: { id: string; name: string; avatar_url: string | null; rating: number }
      }

      return {
        playerId: row.player.id,
        name: row.player.name,
        avatarUrl: row.player.avatar_url,
        rating: row.player.rating ?? 1000,
        rank: row.all_time_rank,
        matchesPlayed: row.matches_played,
        wins: row.wins,
        losses: row.losses,
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
      } as PlayerRankingStats
    },
  })
}
