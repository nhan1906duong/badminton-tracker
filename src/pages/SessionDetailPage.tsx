import { useNavigate, useParams } from 'react-router-dom'
import { usePlayers } from '../hooks/usePlayers'
import { useMatches, useDeleteMatch } from '../hooks/useMatches'
import { useEndSession } from '../hooks/useSessions'
import { useSessionStore } from '../stores/session-store'
import MatchCard from '../components/MatchCard'
import { Check, Plus, Users, Trophy, Trash2, X } from 'lucide-react'
import { useState } from 'react'

export default function SessionDetailPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: allPlayers } = usePlayers()
  const { data: matches, isLoading: matchesLoading } = useMatches(sessionId)
  const deleteMatch = useDeleteMatch()
  const endSession = useEndSession()

  const activePlayers = useSessionStore((s) => s.activePlayers)
  const togglePlayer = useSessionStore((s) => s.togglePlayer)
  const setPlayers = useSessionStore((s) => s.setPlayers)
  const clearSession = useSessionStore((s) => s.clearSession)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  if (!sessionId) {
    return (
      <div className="min-h-svh bg-gray-50 px-4 py-5">
        <p className="text-sm text-gray-400">Session not found.</p>
      </div>
    )
  }

  const sid = sessionId

  const selectedIds = activePlayers[sid] || []
  const allSelected = selectedIds.length === (allPlayers?.length ?? 0)

  function handleSelectAll() {
    if (!allPlayers) return
    if (allSelected) {
      setPlayers(sid, [])
    } else {
      setPlayers(sid, allPlayers.map((p) => p.id))
    }
  }

  async function handleEndSession() {
    try {
      await endSession.mutateAsync(sid)
      clearSession(sid)
      navigate('/sessions')
    } catch {
      // error handled by mutation
    }
  }

  async function handleDeleteMatch(matchId: string) {
    try {
      await deleteMatch.mutateAsync(matchId)
      setDeleteId(null)
    } catch {
      // error handled by mutation
    }
  }

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-6 pb-32">
        {/* Active Players */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Players
            </span>
            <button
              onClick={handleSelectAll}
              className="text-xs font-semibold text-green-600 active:text-green-700"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {allPlayers?.map((player) => {
              const isActive = selectedIds.includes(player.id)
              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(sid, player.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                    isActive
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {isActive && <Check className="w-3.5 h-3.5" />}
                  {player.name}
                </button>
              )
            })}
          </div>
        </section>

        {/* Matches */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Matches
            </span>
            <span className="text-xs text-gray-400">
              {matches?.length ?? 0} recorded
            </span>
          </div>

          {matchesLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading matches...</div>
          ) : matches && matches.length > 0 ? (
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.id} className="relative">
                  <MatchCard match={match} />
                  <button
                    onClick={() => setDeleteId(match.id)}
                    className="absolute top-3 right-3 p-1.5 text-gray-300 active:text-red-500 active:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              No matches yet. Tap below to add one.
            </div>
          )}
        </section>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 max-w-lg mx-auto z-30 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/sessions/${sid}/matches/new`)}
          className="flex-1 py-3.5 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 bg-green-600 text-white shadow-lg shadow-green-600/25 active:scale-[0.98] transition-all"
          style={{ minHeight: 52 }}
        >
          <Plus className="w-5 h-5" />
          Add Match
        </button>
        <button
          onClick={handleEndSession}
          disabled={endSession.isPending}
          className="px-5 py-3.5 rounded-2xl text-[15px] font-bold bg-gray-100 text-gray-600 active:bg-gray-200 transition-all disabled:opacity-50"
          style={{ minHeight: 52 }}
        >
          {endSession.isPending ? '...' : 'End'}
        </button>
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-gray-900">Delete Match?</p>
              <button onClick={() => setDeleteId(null)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">This will remove the match and all its scores.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMatch(deleteId)}
                disabled={deleteMatch.isPending}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-600 text-white"
              >
                {deleteMatch.isPending ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
