import { useNavigate, useParams } from 'react-router-dom'
import { useMatch } from '../hooks/useMatches'
import { MATCH_TYPE_LABELS } from '../types/database'
import { ArrowLeft, Calendar, Trophy, Users } from 'lucide-react'

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: match, isLoading } = useMatch(id ?? '')

  if (isLoading) {
    return (
      <div className="p-4 pb-24 text-center py-12 text-gray-400">Loading match...</div>
    )
  }

  if (!match) {
    return (
      <div className="p-4 pb-24 text-center py-12">
        <p className="text-sm text-gray-400">Match not found.</p>
        <button
          onClick={() => navigate('/')}
          className="text-green-600 text-sm mt-2 hover:underline font-medium"
        >
          Go home
        </button>
      </div>
    )
  }

  const teamA = match.participants.filter(
    p => match.teams.find(t => t.id === p.team_id)?.team_label === 'TEAM_A'
  )
  const teamB = match.participants.filter(
    p => match.teams.find(t => t.id === p.team_id)?.team_label === 'TEAM_B'
  )
  const winnerTeam = match.teams.find(t => t.is_winner)
  const winnerLabel = winnerTeam?.team_label

  const playedDate = new Date(match.played_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">Match Details</h2>
      </div>

      {/* Match type + date */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
          {MATCH_TYPE_LABELS[match.match_type]}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          {playedDate}
        </div>
      </div>

      {/* Teams */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-4">
          {/* Team A */}
          <div className={`flex-1 text-center ${winnerLabel === 'TEAM_A' ? 'text-blue-700' : 'text-gray-700'}`}>
            <div className={`inline-flex items-center gap-1 mb-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              winnerLabel === 'TEAM_A' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <Users className="w-3 h-3" />
              Team A
            </div>
            <div className="space-y-1">
              {teamA.map(p => (
                <p key={p.player.id} className={`text-sm font-semibold ${winnerLabel === 'TEAM_A' ? 'text-blue-800' : ''}`}>
                  {p.player.name}
                </p>
              ))}
            </div>
            {winnerLabel === 'TEAM_A' && (
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                <Trophy className="w-3.5 h-3.5" />
                Winner
              </div>
            )}
          </div>

          <span className="text-lg font-bold text-gray-300">vs</span>

          {/* Team B */}
          <div className={`flex-1 text-center ${winnerLabel === 'TEAM_B' ? 'text-red-700' : 'text-gray-700'}`}>
            <div className={`inline-flex items-center gap-1 mb-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              winnerLabel === 'TEAM_B' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <Users className="w-3 h-3" />
              Team B
            </div>
            <div className="space-y-1">
              {teamB.map(p => (
                <p key={p.player.id} className={`text-sm font-semibold ${winnerLabel === 'TEAM_B' ? 'text-red-800' : ''}`}>
                  {p.player.name}
                </p>
              ))}
            </div>
            {winnerLabel === 'TEAM_B' && (
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-600">
                <Trophy className="w-3.5 h-3.5" />
                Winner
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scores */}
      {match.scores.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Set Scores</p>
          <div className="space-y-2">
            {match.scores.map(score => (
              <div
                key={score.set_number}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl"
              >
                <span className="text-xs font-medium text-gray-500">Set {score.set_number}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${
                    score.team_a_score > score.team_b_score ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    {score.team_a_score}
                  </span>
                  <span className="text-xs text-gray-300">-</span>
                  <span className={`text-sm font-bold ${
                    score.team_b_score > score.team_a_score ? 'text-red-700' : 'text-gray-500'
                  }`}>
                    {score.team_b_score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
