import { useMemo } from 'react'
import { useMatches } from './useMatches'
import { useSessions } from './useSessions'
import type { MatchWithDetails, Player, Session } from '../types/database'

export interface PairRankingStats {
  key: string
  player1: Player
  player2: Player
  wins: number
  losses: number
  matchesPlayed: number
  winRate: number
}

export function computeMenDoublesRankings(
  allMatches: MatchWithDetails[],
  allSessions: Session[],
): PairRankingStats[] {
  const endedSessionIds = new Set(
    allSessions.filter((s) => s.ended_at !== null).map((s) => s.id)
  )

  const completed = allMatches.filter(
    (m) =>
      m.match_type === 'MEN_DOUBLES' &&
      m.status === 'COMPLETED' &&
      m.teams.some((t) => t.is_winner) &&
      endedSessionIds.has(m.session_id)
  )

  const pairMap = new Map<string, {
    player1: Player
    player2: Player
    wins: number
    losses: number
    matchesPlayed: number
  }>()

  for (const match of completed) {
    for (const team of match.teams) {
      const members = match.participants
        .filter((p) => p.team_id === team.id)
        .sort((a, b) => a.player_id.localeCompare(b.player_id))
      if (members.length !== 2) continue

      const key = `${members[0].player_id}:${members[1].player_id}`
      const entry = pairMap.get(key) ?? {
        player1: members[0].player,
        player2: members[1].player,
        wins: 0,
        losses: 0,
        matchesPlayed: 0,
      }

      entry.matchesPlayed += 1
      if (team.is_winner) entry.wins += 1
      else entry.losses += 1

      pairMap.set(key, entry)
    }
  }

  return Array.from(pairMap.entries())
    .map(([key, s]) => ({ key, ...s, winRate: s.matchesPlayed > 0 ? s.wins / s.matchesPlayed : 0 }))
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.matchesPlayed - a.matchesPlayed
    })
}

export function useMenDoublesRankings() {
  const { data: allMatches, isLoading: matchesLoading } = useMatches()
  const { data: allSessions, isLoading: sessionsLoading } = useSessions()

  const rankings = useMemo<PairRankingStats[]>(
    () => computeMenDoublesRankings(allMatches ?? [], allSessions ?? []),
    [allMatches, allSessions],
  )

  return { rankings, isLoading: matchesLoading || sessionsLoading }
}
