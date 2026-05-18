import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { Calendar, Plus } from 'lucide-react'
import FloatingActionButton from '../components/FloatingActionButton'

export default function SessionsListPage() {
  const navigate = useNavigate()
  const { data: sessions, isLoading } = useSessions()

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-4 pb-32">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading sessions...</div>
        ) : sessions && sessions.length > 0 ? (
          sessions.map(session => (
            <button
              key={session.id}
              onClick={() => navigate(`/sessions/${session.id}`)}
              className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 active:scale-[0.98] transition-transform"
            >
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
            </button>
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
    </div>
  )
}
