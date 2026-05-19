import { useNavigate, useParams } from 'react-router-dom'
import { usePlayers } from '../hooks/usePlayers'
import { useMatches, useDeleteMatch } from '../hooks/useMatches'
import { useSessionDonationStats } from '../hooks/usePlayerStats'
import { useSessionStore } from '../stores/session-store'
import MatchCard from '../components/MatchCard'
import FloatingActionButton from '../components/FloatingActionButton'
import ActivePlayersEditor from '../components/ActivePlayersEditor'
import { formatCurrency, LOSS_PENALTY_VND } from '../lib/currency'
import { Plus, Users, Trophy, X, TrendingUp, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export default function SessionDetailPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: allPlayers, isLoading: playersLoading } = usePlayers()
  const { data: matches, isLoading: matchesLoading } = useMatches(sessionId)
  const deleteMatch = useDeleteMatch()

  const activePlayers = useSessionStore((s) => s.activePlayers)
  const setPlayers = useSessionStore((s) => s.setPlayers)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [swipedMatchId, setSwipedMatchId] = useState<string | null>(null)

  if (!sessionId) {
    return (
      <div className="min-h-svh bg-gray-50 px-4 py-5">
        <p className="text-sm text-gray-400">Session not found.</p>
      </div>
    )
  }

  const sid = sessionId

  const selectedIds = activePlayers[sid] || []
  const { totalLosses, totalDonatedVnd } = useSessionDonationStats(sid)

  async function handleDeleteMatch(matchId: string) {
    setSwipedMatchId(null)
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
          <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Active Players
          </span>
          <ActivePlayersEditor
            players={allPlayers ?? []}
            selectedIds={selectedIds}
            onChange={(ids) => setPlayers(sid, ids)}
            isLoading={playersLoading}
          />
        </section>

        {/* Total Donated — tap to open donor list */}
        {totalLosses > 0 && (
          <section>
            <button
              onClick={() => navigate(`/sessions/${sid}/donated`)}
              className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-400">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Total Donated
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-500">
                    {formatCurrency(totalDonatedVnd)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {totalLosses} losses × {formatCurrency(LOSS_PENALTY_VND)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 mt-0.5 shrink-0" />
              </div>
            </button>
          </section>
        )}

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
              {matches.map((match, idx) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  index={idx}
                  isSwiped={swipedMatchId === match.id}
                  onSwipeOpen={() => setSwipedMatchId(match.id)}
                  onSwipeClose={() => setSwipedMatchId(null)}
                  onDelete={() => setDeleteId(match.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              No matches yet. Tap below to add one.
            </div>
          )}
        </section>
      </div>

      {/* FAB — Add Match */}
      <FloatingActionButton
        onClick={() => navigate(`/sessions/${sid}/matches/new`)}
        icon={<Plus className="w-6 h-6" />}
        ariaLabel="Add match"
      />

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
