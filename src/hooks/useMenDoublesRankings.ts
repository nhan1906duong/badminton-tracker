import { useMemo } from 'react'
import { useMatches } from './useMatches'
import { useSessions } from './useSessions'
import { calculateMatchPoints, teamAvgRating, SCORING_CONFIG } from '../lib/rating'
import type { MatchWithDetails, Player, Session } from '../types/database'

export interface PairRankingStats {
  key: string
  player1: Player
  player2: Player
  wins: number
  losses: number
  matchesPlayed: number
  winRate: number
  totalPoints: number
  avgPoints: number
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
    totalPoints: number
  }>()

  for (const match of completed) {
    const firstScore = [...match.scores].sort((a, b) => a.set_number - b.set_number)[0]

    for (const team of match.teams) {
      const members = match.participants
        .filter((p) => p.team_id === team.id)
        .sort((a, b) => a.player_id.localeCompare(b.player_id))
      if (members.length !== 2) continue

      const opponentTeam = match.teams.find((t) => t.id !== team.id)
      const opponentMembers = match.participants.filter((p) => p.team_id === opponentTeam?.id)

      const isTeamA = team.team_label === 'TEAM_A'
      const teamScore = firstScore ? (isTeamA ? firstScore.team_a_score : firstScore.team_b_score) : 0
      const opponentScore = firstScore ? (isTeamA ? firstScore.team_b_score : firstScore.team_a_score) : 0

      const teamRating = teamAvgRating(members.map((m) => m.player.rating ?? SCORING_CONFIG.initialRating))
      const opponentRating = teamAvgRating(opponentMembers.map((m) => m.player.rating ?? SCORING_CONFIG.initialRating))

      const breakdown = calculateMatchPoints({
        isWinner: team.is_winner,
        teamScore,
        opponentScore,
        teamRating,
        opponentTeamRating: opponentRating,
      })

      const key = `${members[0].player_id}:${members[1].player_id}`
      const entry = pairMap.get(key) ?? {
        player1: members[0].player,
        player2: members[1].player,
        wins: 0,
        losses: 0,
        matchesPlayed: 0,
        totalPoints: 0,
      }

      entry.matchesPlayed += 1
      if (team.is_winner) entry.wins += 1
      else entry.losses += 1
      entry.totalPoints += breakdown.total

      pairMap.set(key, entry)
    }
  }

  return Array.from(pairMap.entries())
    .map(([key, s]) => ({
      key,
      ...s,
      winRate: s.matchesPlayed > 0 ? s.wins / s.matchesPlayed : 0,
      avgPoints: s.matchesPlayed > 0 ? Math.round(s.totalPoints / s.matchesPlayed) : 0,
    }))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
      if (b.avgPoints !== a.avgPoints) return b.avgPoints - a.avgPoints
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
