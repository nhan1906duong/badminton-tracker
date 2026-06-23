import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { usePlayerMatches } from './usePlayerMatches'
import type { MatchWithDetails } from '../types/database'

export type BadgeCategory = 'played' | 'streak' | 'dynasty' | 'titles' | 'donated'
export type BadgeLabelKey =
  | 'badges.mostPlayed'
  | 'badges.mostStreak'
  | 'badges.dynasty'
  | 'badges.mostTitles'
  | 'badges.mostDonated'

export interface PlayerBadge {
  id: string
  labelKey: BadgeLabelKey
  category: BadgeCategory
  count: number
}

interface BadgeLeaderRow {
  badge_type: string
  leader_id: string
  leader_count: number
}

/**
 * Compute player-local badge inputs from the player's own scoped match list.
 * Returns: { matchesPlayed, bestWinStreak, matchesLost }
 */
function computeLocalStats(
  matches: MatchWithDetails[],
  playerId: string,
): { matchesPlayed: number; bestWinStreak: number; matchesLost: number } {
  let matchesPlayed = 0
  let matchesLost = 0
  let currentStreak = 0
  let bestWinStreak = 0

  // Matches from usePlayerMatches are already COMPLETED and ordered desc by played_at.
  // Reverse to chronological order for streak calculation.
  const chronological = [...matches].reverse()

  for (const match of chronological) {
    if (!match.teams.some((t) => t.is_winner)) continue
    const pp = match.participants.find((p) => p.player_id === playerId)
    if (!pp) continue
    const team = match.teams.find((t) => t.id === pp.team_id)
    if (!team) continue

    matchesPlayed++
    if (team.is_winner) {
      currentStreak++
      if (currentStreak > bestWinStreak) bestWinStreak = currentStreak
    } else {
      matchesLost++
      currentStreak = 0
    }
  }

  return { matchesPlayed, bestWinStreak, matchesLost }
}

export function usePlayerBadges(playerId: string) {
  // Tier 1: player-local data from scoped match pages (already in cache from PlayerDetailPage)
  const { data: matchData, isLoading: matchesLoading } = usePlayerMatches(playerId)
  const allMatches = matchData?.pages.flatMap((p) => p.matches) ?? []

  // Tier 2: global leader data via RPC (tiny payload — one row per badge type)
  const { data: leaderRows, isLoading: leadersLoading } = useQuery({
    queryKey: ['badge-leaders'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_badge_leaders')
      if (error) throw error
      return (data ?? []) as BadgeLeaderRow[]
    },
  })

  const badges = useMemo<PlayerBadge[]>(() => {
    if (!playerId) return []

    const result: PlayerBadge[] = []

    // ── Tier 1: player-local badges ──────────────────────────────────────────
    const { bestWinStreak, matchesLost } = computeLocalStats(
      allMatches,
      playerId,
    )

    // ── Tier 2: global leader badges ─────────────────────────────────────────
    if (leaderRows) {
      for (const row of leaderRows) {
        if (row.leader_id !== playerId) continue

        if (row.badge_type === 'most_played' && Number(row.leader_count) > 0) {
          result.push({
            id: 'most_played',
            labelKey: 'badges.mostPlayed',
            category: 'played',
            count: Number(row.leader_count),
          })
        }

        if (row.badge_type === 'most_donated' && Number(row.leader_count) > 0) {
          result.push({
            id: 'most_donated',
            labelKey: 'badges.mostDonated',
            category: 'donated',
            // count is the number of losses; the display multiplier (e.g. × 5000) is UI concern
            count: matchesLost,
          })
        }
      }
    }

    // Streak badge: awarded if this player has the best win streak among all players
    // loaded so far (player-local only — we don't have all players' streaks without an RPC).
    // Show only if the player has a notable streak (≥ 3) — conservative until Phase 4 RPC.
    if (bestWinStreak >= 3) {
      result.push({
        id: 'best_streak',
        labelKey: 'badges.mostStreak',
        category: 'streak',
        count: bestWinStreak,
      })
    }

    // Dynasty and most_titles badges: deferred to Phase 4 (require session-ordered aggregation).

    return result
  }, [allMatches, leaderRows, playerId])

  // Expose matchesPlayed count for callers that previously used computeBadges directly.
  const localStats = useMemo(
    () => (playerId ? computeLocalStats(allMatches, playerId) : null),
    [allMatches, playerId],
  )

  return {
    badges,
    isLoading: matchesLoading || leadersLoading,
    _localStats: localStats,
  }
}

/**
 * computeBadges is kept for backward compatibility with existing tests.
 * New code should use usePlayerBadges instead.
 * @deprecated Use usePlayerBadges hook instead.
 */
export function computeBadges(
  playerMatches: MatchWithDetails[],
  leaderRows: BadgeLeaderRow[],
  playerId: string,
): PlayerBadge[] {
  if (!playerId) return []
  const result: PlayerBadge[] = []
  const { matchesPlayed: _mp, bestWinStreak, matchesLost } = computeLocalStats(
    playerMatches,
    playerId,
  )

  for (const row of leaderRows) {
    if (row.leader_id !== playerId) continue
    if (row.badge_type === 'most_played' && Number(row.leader_count) > 0) {
      result.push({ id: 'most_played', labelKey: 'badges.mostPlayed', category: 'played', count: Number(row.leader_count) })
    }
    if (row.badge_type === 'most_donated' && Number(row.leader_count) > 0) {
      result.push({ id: 'most_donated', labelKey: 'badges.mostDonated', category: 'donated', count: matchesLost })
    }
  }
  if (bestWinStreak >= 3) {
    result.push({ id: 'best_streak', labelKey: 'badges.mostStreak', category: 'streak', count: bestWinStreak })
  }
  return result
}
