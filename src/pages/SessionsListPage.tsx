import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions, useDeleteSession } from '../hooks/useSessions'
import { SwipeableItem } from '../components/SwipeableItem'
import { Calendar, Plus, Trash2, X } from 'lucide-react'
import FloatingActionButton from '../components/FloatingActionButton'

export default function SessionsListPage() {
  const navigate = useNavigate()
  const { data: sessions, isLoading } = useSessions()
  const deleteSession = useDeleteSession()
  const [swipedSessionId, setSwipedSessionId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setSwipedSessionId(null)
    try {
      await deleteSession.mutateAsync(id)
      setConfirmDeleteId(null)
    } catch {
      // handled by mutation
    }
  }

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-4 pb-32">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading sessions...</div>
        ) : sessions && sessions.length > 0 ? (
          sessions.map(session => (
            <SwipeableItem
              key={session.id}
              isOpen={swipedSessionId === session.id}
              onOpen={() => setSwipedSessionId(session.id)}
              onClose={() => setSwipedSessionId(null)}
              onClick={() => navigate(`/sessions/${session.id}`, { state: { from: '/sessions' } })}
              renderAction={() => (
                <button
                  onClick={() => setConfirmDeleteId(session.id)}
                  className="flex flex-col items-center gap-0.5 text-white"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">Delete</span>
                </button>
              )}
            >
              <div className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 select-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-bold text-gray-900">
                      {session.label || new Date(session.started_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(session.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                  {!session.ended_at && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </SwipeableItem>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">No sessions yet.</p>
            <p className="text-sm text-gray-400 mt-1">Tap + to start one.</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <FloatingActionButton
        onClick={() => navigate('/sessions/new')}
        icon={<Plus className="w-6 h-6" />}
        ariaLabel="Create new session"
      />

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-gray-900">Delete Session?</p>
              <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">This will remove the session and all its matches.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deleteSession.isPending}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-600 text-white"
              >
                {deleteSession.isPending ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
