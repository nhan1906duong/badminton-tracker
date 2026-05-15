import { useNavigate } from 'react-router-dom'
import { useMatches, useDeleteMatch } from '../hooks/useMatches'
import MatchCard from '../components/MatchCard'
import { MATCH_TYPE_LABELS, type MatchType } from '../types/database'
import { ArrowLeft, Trash2, Loader2, Trophy, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

export default function MatchesPage() {
  const navigate = useNavigate()
  const { data: matches, isLoading } = useMatches()
  const deleteMatch = useDeleteMatch()

  const [filterType, setFilterType] = useState<MatchType | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filtered = matches?.filter(m => {
    if (filterType === 'all') return true
    return m.match_type === filterType
  })

  // Group by date
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  const groups: { label: string; matches: typeof filtered }[] = []
  const todayMatches = filtered?.filter(m => new Date(m.played_at).toDateString() === today)
  const ydayMatches = filtered?.filter(m => new Date(m.played_at).toDateString() === yesterday)
  const earlierMatches = filtered?.filter(m => {
    const d = new Date(m.played_at).toDateString()
    return d !== today && d !== yesterday
  })

  if (todayMatches?.length) groups.push({ label: 'Today', matches: todayMatches })
  if (ydayMatches?.length) groups.push({ label: 'Yesterday', matches: ydayMatches })
  if (earlierMatches?.length) groups.push({ label: 'Earlier', matches: earlierMatches })

  const matchTypes = Object.keys(MATCH_TYPE_LABELS) as MatchType[]

  async function handleDelete(id: string) {
    try {
      await deleteMatch.mutateAsync(id)
      setConfirmDeleteId(null)
    } catch {
      // error handled by mutation
    }
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex-1">All Matches</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg ${showFilters ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              filterType === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            All
          </button>
          {matchTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                filterType === type ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {MATCH_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading matches...</div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-400">No matches found.</p>
          <button
            onClick={() => navigate('/matches/new')}
            className="text-green-600 text-sm mt-2 hover:underline font-medium"
          >
            Record a match
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">{group.label}</p>
              <div className="space-y-2">
                {group.matches?.map(match => (
                  <div key={match.id} className="relative group">
                    <MatchCard match={match} />
                    <button
                      onClick={() => setConfirmDeleteId(match.id)}
                      className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-xl">
            <p className="text-sm font-medium text-gray-900 mb-1">Delete this match?</p>
            <p className="text-xs text-gray-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deleteMatch.isPending}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleteMatch.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
