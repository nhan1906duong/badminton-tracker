import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateSession } from '../hooks/useSessions'
import { Loader2, Play } from 'lucide-react'

export default function CreateSessionPage() {
  const navigate = useNavigate()
  const createSession = useCreateSession()
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  const defaultLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  async function handleStart() {
    setError('')
    try {
      const session = await createSession.mutateAsync({
        label: label.trim() || undefined,
      })
      navigate(`/sessions/${session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    }
  }

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-6 pb-32">
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
