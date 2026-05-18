import { useNavigate } from 'react-router-dom'
import type { MatchWithDetails } from '../types/database'
import { MATCH_TYPE_LABELS } from '../types/database'
import { Calendar, Trophy, ChevronRight } from 'lucide-react'

interface MatchCardProps {
  match: MatchWithDetails
}

export default function MatchCard({ match }: MatchCardProps) {
  const navigate = useNavigate()

  function handleClick() {
    navigate(`/sessions/${match.session_id}/matches/${match.id}/edit`)
  }

  const teamA = match.participants.filter(
    p => match.teams.find(t => t.id === p.team_id)?.team_label === 'TEAM_A'
  )
  const teamB = match.participants.filter(
    p => match.teams.find(t => t.id === p.team_id)?.team_label === 'TEAM_B'
  )
  const winnerTeam = match.teams.find(t => t.is_winner)
  const winnerLabel = winnerTeam?.team_label

  const teamAName = teamA.map(p => p.player.name).join(' & ')
  const teamBName = teamB.map(p => p.player.name).join(' & ')

  const playedDate = new Date(match.played_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const scoreSummary = match.scores.length > 0
    ? match.scores.map(s => `${s.team_a_score}-${s.team_b_score}`).join(', ')
    : null

  return (
    <button
      onClick={handleClick}
      className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 active:scale-[0.98] transition-transform"
    >
      {/* Header: type + date */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
          {MATCH_TYPE_LABELS[match.match_type]}
        </span>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Calendar className="w-3 h-3" />
          {playedDate}
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-2 [@media(max-width:380px)]:gap-1.5">
        {/* Team A */}
        <div className={`flex-1 text-right min-w-0 ${winnerLabel === 'TEAM_A' ? 'text-blue-700' : 'text-gray-600'}`}>
          <p className={`text-sm truncate ${winnerLabel === 'TEAM_A' ? 'font-bold' : 'font-medium'}`}>
            {teamAName}
          </p>
          {winnerLabel === 'TEAM_A' && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 font-bold">
              <Trophy className="w-3 h-3" />
              Winner
            </span>
          )}
        </div>

        {/* Score */}
        <div className="text-center px-1.5 shrink-0">
          {scoreSummary ? (
            <p className="text-sm font-bold text-gray-800 tabular-nums">
              {scoreSummary}
            </p>
          ) : (
            <span className="text-xs text-gray-300 font-bold">vs</span>
          )}
        </div>

        {/* Team B */}
        <div className={`flex-1 text-left min-w-0 ${winnerLabel === 'TEAM_B' ? 'text-red-700' : 'text-gray-600'}`}>
          <p className={`text-sm truncate ${winnerLabel === 'TEAM_B' ? 'font-bold' : 'font-medium'}`}>
            {teamBName}
          </p>
          {winnerLabel === 'TEAM_B' && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-red-500 font-bold">
              <Trophy className="w-3 h-3" />
              Winner
            </span>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      </div>
    </button>
  )
}
