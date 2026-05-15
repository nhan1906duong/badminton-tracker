import { useNavigate } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'
import MatchCard from '../components/MatchCard'
import { Plus, Users, Trophy, ChevronRight } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const { data: matches, isLoading } = useMatches()

  const totalMatches = matches?.length ?? 0
  const recentMatches = matches?.slice(0, 5) ?? []

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
        {totalMatches > 0 && (
          <button
            onClick={() => navigate('/matches')}
            className="flex items-center gap-0.5 text-xs text-green-600 font-medium hover:underline"
          >
            See all
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading matches...</div>
      ) : totalMatches === 0 ? (
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
          {recentMatches.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}
