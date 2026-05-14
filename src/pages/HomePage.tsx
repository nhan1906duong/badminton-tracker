import { useNavigate } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'
import { MATCH_TYPE_LABELS } from '../types/database'
import { Plus, Users, Trophy, Calendar } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const { data: matches, isLoading } = useMatches()

  const totalMatches = matches?.length ?? 0

  return (
    <div className="p-4 pb-24">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-600 text-white rounded-2xl p-4">
          <Trophy className="w-5 h-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{totalMatches}</p>
          <p className="text-xs opacity-80">Total Matches</p>
        </div>
        <div className="bg-blue-600 text-white rounded-2xl p-4">
          <Users className="w-5 h-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{matches?.[0]?.participants.length ?? 0}</p>
          <p className="text-xs opacity-80">Last Match Players</p>
        </div>
      </div>

      {/* Quick action */}
      <button
        onClick={() => navigate('/matches/new')}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-semibold mb-6 hover:bg-gray-800"
      >
        <Plus className="w-4 h-4" />
        Record New Match
      </button>

      {/* Recent matches */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">Recent Matches</h3>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading matches...</div>
      ) : matches?.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-2xl">
          <Trophy className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">No matches yet.</p>
          <button
            onClick={() => navigate('/matches/new')}
            className="text-green-600 text-sm mt-1 hover:underline font-medium"
          >
            Record your first match
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {matches?.slice(0, 10).map(match => {
            const teamA = match.participants.filter(p => match.teams.find(t => t.id === p.team_id)?.team_label === 'TEAM_A')
            const teamB = match.participants.filter(p => match.teams.find(t => t.id === p.team_id)?.team_label === 'TEAM_B')
            const winnerTeam = match.teams.find(t => t.is_winner)
            const winnerLabel = winnerTeam?.team_label
            const playedDate = new Date(match.played_at).toLocaleDateString()

            return (
              <div
                key={match.id}
                className="bg-white border border-gray-100 rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    {MATCH_TYPE_LABELS[match.match_type]}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {playedDate}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Team A */}
                  <div className={`flex-1 text-right ${winnerLabel === 'TEAM_A' ? 'text-blue-700 font-semibold' : 'text-gray-600'}`}>
                    <div className="text-xs truncate">
                      {teamA.map(p => p.player.name).join(' & ')}
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="text-center px-2">
                    {match.scores.length > 0 ? (
                      <div className="text-xs font-bold text-gray-700">
                        {match.scores.map(s => (
                          <span key={s.set_number} className="mr-1">
                            {s.team_a_score}-{s.team_b_score}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400">vs</span>
                    )}
                  </div>

                  {/* Team B */}
                  <div className={`flex-1 text-left ${winnerLabel === 'TEAM_B' ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
                    <div className="text-xs truncate">
                      {teamB.map(p => p.player.name).join(' & ')}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
