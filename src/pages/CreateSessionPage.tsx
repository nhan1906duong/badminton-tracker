import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateSession } from '../hooks/useSessions'
import { usePlayers } from '../hooks/usePlayers'
import { useTopJoinedPlayers } from '../hooks/useTopJoinedPlayers'
import { useSessionStore } from '../stores/session-store'
import ActivePlayersEditor from '../components/ActivePlayersEditor'
import { Loader2, Play, Users } from 'lucide-react'

export default function CreateSessionPage() {
  const navigate = useNavigate()
  const createSession = useCreateSession()
  const { data: allPlayers, isLoading: playersLoading } = usePlayers()
  const { players: topPlayers, isLoading: topLoading } = useTopJoinedPlayers(5)
  const setSessionPlayers = useSessionStore((s) => s.setPlayers)

  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Apply top-5 defaults only once after data loads, so user edits aren't overwritten
  const defaultsAppliedRef = useRef(false)

  useEffect(() => {
    if (defaultsAppliedRef.current) return
    if (topLoading || playersLoading) return
    setSelectedIds(topPlayers.map((p) => p.id))
    defaultsAppliedRef.current = true
  }, [topLoading, playersLoading, topPlayers])

  const defaultLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  async function handleStart() {
    setError('')
    try {
      const session = await createSession.mutateAsync({
        label: label.trim() || undefined,
      })
      setSessionPlayers(session.id, selectedIds)
      navigate(`/sessions/${session.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    }
  }

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-6 pb-32">
        <section className="space-y-3">
          <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Active Players
          </span>
          <ActivePlayersEditor
            players={allPlayers ?? []}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            isLoading={playersLoading || topLoading}
          />
        </section>

        <section className="space-y-3">
          <span className="text-sm font-bold text-gray-900">Session Name</span>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder={defaultLabel}
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-[15px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            style={{ minHeight: 52 }}
          />
          <p className="text-xs text-gray-400">Leave blank to auto-fill with today's date.</p>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Bottom Start button */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 max-w-lg mx-auto z-30 px-4 py-3">
        <button
          onClick={handleStart}
          disabled={createSession.isPending}
          className="w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-green-600 text-white shadow-lg shadow-green-600/25"
          style={{ minHeight: 56 }}
        >
          {createSession.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          {createSession.isPending ? 'Starting...' : 'Start Session'}
        </button>
      </div>
    </div>
  )
}
