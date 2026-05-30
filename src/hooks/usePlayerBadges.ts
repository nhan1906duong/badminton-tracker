import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMatches } from './useMatches'
import { useSessions } from './useSessions'
import { supabase } from '../lib/supabase'
import { buildSessionWeeklyRankings } from './useRankings'
import type { MatchWithDetails, Session } from '../types/database'

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

function findLeaders(map: Map<string, number>): Set<string> {
  if (map.size === 0) return new Set()
  const max = Math.max(...map.values())
  if (max === 0) return new Set()
  const leaders = new Set<string>()
  for (const [k, v] of map) {
    if (v === max) leaders.add(k)
  }
  return leaders
}

export function computeBadges(
  allMatches: MatchWithDetails[],
  allSessions: Session[],
  allResults: ResultRow[],
  playerId: string,
): PlayerBadge[] {
  if (!playerId) return []

  const completed = allMatches.filter(
    (m) => m.status === 'COMPLETED' && m.teams.some((t) => t.is_winner)
  )

  // Per-player: matches played and losses (for most-played / most-donated badges)
  const playedMap = new Map<string, number>()
  const lossMap = new Map<string, number>()
  for (const match of completed) {
    for (const p of match.participants) {
      const pid = p.player_id
      playedMap.set(pid, (playedMap.get(pid) ?? 0) + 1)
      const team = match.teams.find((t) => t.id === p.team_id)
      if (!team?.is_winner) lossMap.set(pid, (lossMap.get(pid) ?? 0) + 1)
    }
  }

  // Per-player best win streak (ever)
  const streakMap = new Map<string, number>()
  for (const pid of playedMap.keys()) {
    const playerMatches = completed
      .filter((m) => m.participants.some((p) => p.player_id === pid))
      .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())

    let best = 0
    let current = 0
    for (const match of playerMatches) {
      const pp = match.participants.find((p) => p.player_id === pid)
      const team = match.teams.find((t) => t.id === pp?.team_id)
      if (team?.is_winner) {
        current++
        if (current > best) best = current
      } else {
        current = 0
      }
    }
    streakMap.set(pid, best)
  }

  // Group player_match_results by session for leaderboard-based champion determination
  const sessionResultsMap = new Map<string, ResultRow[]>()
  const playerSessionsMap = new Map<string, Set<string>>()
  for (const r of allResults) {
    const list = sessionResultsMap.get(r.session_id) ?? []
    list.push(r)
    sessionResultsMap.set(r.session_id, list)
    const sessions = playerSessionsMap.get(r.player_id) ?? new Set()
    sessions.add(r.session_id)
    playerSessionsMap.set(r.player_id, sessions)
  }

  const sortedSessions = [...allSessions]
    .filter((s) => sessionResultsMap.has(s.id))
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())

  // Per-session: determine champion using the leaderboard ranking (weeklyPoints)
  const sessionWinnerMap = new Map<string, string | null>()
  const titlesMap = new Map<string, number>()

  for (const session of sortedSessions) {
    const results = sessionResultsMap.get(session.id) ?? []
    const rankings = buildSessionWeeklyRankings(null, results)

    if (rankings.length === 0) {
      sessionWinnerMap.set(session.id, null)
      continue
    }

    const top = rankings[0]
    const second = rankings[1]
    const tied =
      second !== undefined &&
      second.weeklyPoints === top.weeklyPoints &&
      second.averageWeeklyPoints === top.averageWeeklyPoints &&
      second.wins === top.wins &&
      second.pointDifference === top.pointDifference

    sessionWinnerMap.set(session.id, tied ? null : top.playerId)

    if (session.bwf_tournament_id) {
      for (const r of rankings) {
        if (
          r.weeklyPoints === top.weeklyPoints &&
          r.averageWeeklyPoints === top.averageWeeklyPoints &&
          r.wins === top.wins &&
          r.pointDifference === top.pointDifference
        ) {
          titlesMap.set(r.playerId, (titlesMap.get(r.playerId) ?? 0) + 1)
        } else {
          break
        }
      }
    }
  }

  // Per-player: best dynasty streak (longest consecutive session championships)
  const dynastyMap = new Map<string, number>()
  for (const pid of playedMap.keys()) {
    let best = 0
    let current = 0
    for (const session of sortedSessions) {
      if (!playerSessionsMap.get(pid)?.has(session.id)) continue
      if (sessionWinnerMap.get(session.id) === pid) {
        current++
        if (current > best) best = current
      } else {
        current = 0
      }
    }
    dynastyMap.set(pid, best)
  }

  const mostPlayedLeaders = findLeaders(playedMap)
  const bestStreakLeaders = findLeaders(streakMap)
  const dynastyLeaders = findLeaders(dynastyMap)
  const mostTitlesLeaders = findLeaders(titlesMap)
  const mostDonatedLeaders = findLeaders(lossMap)

  const result: PlayerBadge[] = []
  if (mostTitlesLeaders.has(playerId))
    result.push({ id: 'most_titles', labelKey: 'badges.mostTitles', category: 'titles', count: titlesMap.get(playerId) ?? 0 })
  if (mostPlayedLeaders.has(playerId))
    result.push({ id: 'most_played', labelKey: 'badges.mostPlayed', category: 'played', count: playedMap.get(playerId) ?? 0 })
  if (bestStreakLeaders.has(playerId))
    result.push({ id: 'best_streak', labelKey: 'badges.mostStreak', category: 'streak', count: streakMap.get(playerId) ?? 0 })
  if (dynastyLeaders.has(playerId) && (dynastyMap.get(playerId) ?? 0) > 1)
    result.push({ id: 'dynasty', labelKey: 'badges.dynasty', category: 'dynasty', count: dynastyMap.get(playerId) ?? 0 })
  if (mostDonatedLeaders.has(playerId))
    result.push({ id: 'most_donated', labelKey: 'badges.mostDonated', category: 'donated', count: (lossMap.get(playerId) ?? 0) * 5000 })

  return result
}

export function usePlayerBadges(playerId: string) {
  const { data: allMatches, isLoading: matchesLoading } = useMatches()
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

  const badges = useMemo<PlayerBadge[]>(
    () => computeBadges(allMatches ?? [], allSessions ?? [], allResults ?? [], playerId),
    [allMatches, allSessions, allResults, playerId],
  )

  return { badges, isLoading: matchesLoading || sessionsLoading || resultsLoading }
}
