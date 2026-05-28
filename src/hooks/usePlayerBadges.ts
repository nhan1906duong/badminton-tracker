import { useMemo } from 'react'
import { useMatches } from './useMatches'
import { useSessions } from './useSessions'

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

export function usePlayerBadges(playerId: string) {
  const { data: allMatches, isLoading: matchesLoading } = useMatches()
  const { data: allSessions, isLoading: sessionsLoading } = useSessions()

  const badges = useMemo<PlayerBadge[]>(() => {
    if (!allMatches || !allSessions || !playerId) return []

    const completed = allMatches.filter(
      (m) => m.status === 'COMPLETED' && m.teams.some((t) => t.is_winner)
    )

    // Per-player: matches played, wins, losses
    const playedMap = new Map<string, number>()
    const lossMap = new Map<string, number>()

    for (const match of completed) {
      for (const p of match.participants) {
        const pid = p.player_id
        playedMap.set(pid, (playedMap.get(pid) ?? 0) + 1)
        const team = match.teams.find((t) => t.id === p.team_id)
        if (!team?.is_winner) {
          lossMap.set(pid, (lossMap.get(pid) ?? 0) + 1)
        }
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

    // Group completed matches by session
    const sessionMatchMap = new Map<string, typeof completed>()
    for (const match of completed) {
      const list = sessionMatchMap.get(match.session_id) ?? []
      list.push(match)
      sessionMatchMap.set(match.session_id, list)
    }

    // Sessions sorted ascending by date (for dynasty streak)
    const sortedSessions = [...allSessions]
      .filter((s) => sessionMatchMap.has(s.id))
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())

    // Per-session: find rank-1 player (null if tied)
    const sessionWinnerMap = new Map<string, string | null>()
    const titlesMap = new Map<string, number>()

    for (const session of sortedSessions) {
      const matches = sessionMatchMap.get(session.id)!
      const wins = new Map<string, number>()
      const played = new Map<string, number>()

      for (const match of matches) {
        const winnerTeam = match.teams.find((t) => t.is_winner)
        if (!winnerTeam) continue
        for (const p of match.participants) {
          played.set(p.player_id, (played.get(p.player_id) ?? 0) + 1)
          if (p.team_id === winnerTeam.id) {
            wins.set(p.player_id, (wins.get(p.player_id) ?? 0) + 1)
          }
        }
      }

      const ranked = Array.from(wins.entries()).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        return (played.get(a[0]) ?? 0) - (played.get(b[0]) ?? 0)
      })

      if (ranked.length === 0) {
        sessionWinnerMap.set(session.id, null)
        continue
      }

      const topWins = ranked[0][1]
      const topPlayed = played.get(ranked[0][0]) ?? 0
      const tied =
        ranked.length > 1 &&
        ranked[1][1] === topWins &&
        (played.get(ranked[1][0]) ?? 0) === topPlayed

      const winnerId = tied ? null : ranked[0][0]
      sessionWinnerMap.set(session.id, winnerId)
      // Only count world tour sessions (BWF tournament linked) for titles
      if (winnerId && session.bwf_tournament_id)
        titlesMap.set(winnerId, (titlesMap.get(winnerId) ?? 0) + 1)
    }

    // Per-player: best dynasty streak (longest consecutive session championships)
    const dynastyMap = new Map<string, number>()
    for (const pid of playedMap.keys()) {
      let best = 0
      let current = 0
      for (const session of sortedSessions) {
        const participated = sessionMatchMap
          .get(session.id)
          ?.some((m) => m.participants.some((p) => p.player_id === pid))
        if (!participated) continue
        if (sessionWinnerMap.get(session.id) === pid) {
          current++
          if (current > best) best = current
        } else {
          current = 0
        }
      }
      dynastyMap.set(pid, best)
    }

    // Find single-winner leaders per category
    const mostPlayedLeaders = findLeaders(playedMap)
    const bestStreakLeaders = findLeaders(streakMap)
    const dynastyLeaders = findLeaders(dynastyMap)
    const mostTitlesLeaders = findLeaders(titlesMap)
    const mostDonatedLeaders = findLeaders(lossMap)

    const result: PlayerBadge[] = []

    // World tour titles first
    if (mostTitlesLeaders.has(playerId))
      result.push({ id: 'most_titles', labelKey: 'badges.mostTitles', category: 'titles', count: titlesMap.get(playerId) ?? 0 })
    if (mostPlayedLeaders.has(playerId))
      result.push({ id: 'most_played', labelKey: 'badges.mostPlayed', category: 'played', count: playedMap.get(playerId) ?? 0 })
    if (bestStreakLeaders.has(playerId))
      result.push({ id: 'best_streak', labelKey: 'badges.mostStreak', category: 'streak', count: streakMap.get(playerId) ?? 0 })
    if (dynastyLeaders.has(playerId))
      result.push({ id: 'dynasty', labelKey: 'badges.dynasty', category: 'dynasty', count: dynastyMap.get(playerId) ?? 0 })
    if (mostDonatedLeaders.has(playerId))
      result.push({ id: 'most_donated', labelKey: 'badges.mostDonated', category: 'donated', count: lossMap.get(playerId) ?? 0 })

    return result
  }, [allMatches, allSessions, playerId])

  return { badges, isLoading: matchesLoading || sessionsLoading }
}
