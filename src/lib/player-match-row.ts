import type { MatchWithDetails } from '../types/database'
import { formatShortPlayerName } from './player-name'

const MATCH_TYPE_SHORT: Record<string, string> = {
  MEN_SINGLES: 'MS',
  WOMEN_SINGLES: 'WS',
  MEN_DOUBLES: 'MD',
  WOMEN_DOUBLES: 'WD',
  MIXED_DOUBLES: 'XD',
}

export function getMatchRow(match: MatchWithDetails, playerId: string) {
  const pp = match.participants.find(p => p.player_id === playerId)
  if (!pp) return null
  const playerTeam = match.teams.find(t => t.id === pp.team_id)
  if (!playerTeam) return null
  if (!match.teams.some(t => t.is_winner)) return null
  const isTeamA = playerTeam.team_label === 'TEAM_A'
  const teammates = match.participants
    .filter(p => p.team_id === pp.team_id && p.player_id !== playerId)
    .map(p => formatShortPlayerName(p.player.name))
  const opponents = match.participants
    .filter(p => p.team_id !== pp.team_id)
    .map(p => formatShortPlayerName(p.player.name))
  const scoreStr = match.scores
    .map(s => {
      const my = isTeamA ? s.team_a_score : s.team_b_score
      const opp = isTeamA ? s.team_b_score : s.team_a_score
      return `${my}–${opp}`
    })
    .join(', ')
  return {
    isWin: playerTeam.is_winner,
    teammates: teammates.join(' & '),
    opponents: opponents.join(' & '),
    scoreStr: scoreStr || '—',
    type: MATCH_TYPE_SHORT[match.match_type] ?? '—',
  }
}

export type MatchRow = NonNullable<ReturnType<typeof getMatchRow>>
