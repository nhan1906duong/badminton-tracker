import { useMemo } from 'react'
import { useMatches } from './useMatches'
import type { MatchWithDetails } from '../types/database'

export interface H2HPairsResult {
  teamAWins: number
  teamBWins: number
  totalMatches: number
  matches: MatchWithDetails[]
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setA = new Set(a)
  return b.every((id) => setA.has(id))
}

export function computeH2HPairs(
  allMatches: MatchWithDetails[],
  teamAIds: string[],
  teamBIds: string[],
): H2HPairsResult {
  if (teamAIds.length === 0 || teamBIds.length === 0) {
    return { teamAWins: 0, teamBWins: 0, totalMatches: 0, matches: [] }
  }

  const matched: MatchWithDetails[] = []
  let teamAWins = 0
  let teamBWins = 0

  for (const match of allMatches) {
    if (match.status !== 'COMPLETED') continue
    if (!match.teams.some((t) => t.is_winner)) continue

    const teamA = match.teams.find((t) => t.team_label === 'TEAM_A')
    const teamB = match.teams.find((t) => t.team_label === 'TEAM_B')
    if (!teamA || !teamB) continue

    const teamAPlayers = match.participants.filter((p) => p.team_id === teamA.id).map((p) => p.player_id)
    const teamBPlayers = match.participants.filter((p) => p.team_id === teamB.id).map((p) => p.player_id)

    let leftWins = false
    let rightWins = false

    if (sameSet(teamAPlayers, teamAIds) && sameSet(teamBPlayers, teamBIds)) {
      matched.push(match)
      leftWins = !!teamA.is_winner
      rightWins = !!teamB.is_winner
    } else if (sameSet(teamAPlayers, teamBIds) && sameSet(teamBPlayers, teamAIds)) {
      // Reversed orientation: input teamA is on TEAM_B side
      matched.push(match)
      leftWins = !!teamB.is_winner
      rightWins = !!teamA.is_winner
    } else {
      continue
    }

    if (leftWins) teamAWins++
    else if (rightWins) teamBWins++
  }

  matched.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())

  return { teamAWins, teamBWins, totalMatches: matched.length, matches: matched }
}

export function useH2HPairs(teamAIds: string[], teamBIds: string[]): H2HPairsResult & { isLoading: boolean } {
  const { data: allMatches, isLoading } = useMatches()

  const result = useMemo<H2HPairsResult>(
    () => computeH2HPairs(allMatches ?? [], teamAIds, teamBIds),
    [allMatches, teamAIds, teamBIds],
  )

  return { ...result, isLoading }
}
