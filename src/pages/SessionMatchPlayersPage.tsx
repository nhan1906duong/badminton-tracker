import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePlayers, useCreatePlayer } from '../hooks/usePlayers'
import MatchTypeSelector from '../components/MatchTypeSelector'
import PlayerSelector from '../components/PlayerSelector'
import { getRequiredPlayerCount } from '../lib/match-helpers'
import { useNewMatchStore } from '../stores/new-match-store'
import { useSessionStore } from '../stores/session-store'
import { ArrowRight } from 'lucide-react'

export default function SessionMatchPlayersPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: allPlayers, isLoading: playersLoading } = usePlayers()
  const createPlayer = useCreatePlayer()

  const matchType = useNewMatchStore((s) => s.matchType)
  const selectedIds = useNewMatchStore((s) => s.selectedIds)
  const teamAIds = useNewMatchStore((s) => s.teamAIds)
  const teamBIds = useNewMatchStore((s) => s.teamBIds)
  const setMatchType = useNewMatchStore((s) => s.setMatchType)
  const toggleSelected = useNewMatchStore((s) => s.toggleSelected)
  const addSelected = useNewMatchStore((s) => s.addSelected)

  const activePlayerIds = useSessionStore((s) =>
    sessionId ? s.activePlayers[sessionId] || [] : []
  )

  const [error, setError] = useState('')

  const requiredCount = getRequiredPlayerCount(matchType)
  const playersSelected = selectedIds.length === requiredCount

  // Filter to session-active players if any are selected; otherwise show all
  const players = activePlayerIds.length > 0
    ? (allPlayers?.filter((p) => activePlayerIds.includes(p.id)) ?? [])
    : (allPlayers ?? [])

  async function handleAddPlayer(name: string) {
    try {
      const player = await createPlayer.mutateAsync({ name })
      addSelected(player.id, requiredCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add player')
    }
  }

  function handleNext() {
    if (!playersSelected) {
      setError(`Please select ${requiredCount} players.`)
      return
    }
    setError('')
    navigate(`/sessions/${sessionId}/matches/new/result`)
  }

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-6 pb-32">
        <section className="space-y-3">
          <MatchTypeSelector
            value={matchType}
            onChange={(type) => {
              setMatchType(type)
              setError('')
            }}
          />
        </section>

        <section className="space-y-3">
          <span className="text-sm font-bold text-gray-900">Select Players</span>

          {playersLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading players...</div>
          ) : players.length === 0 && activePlayerIds.length > 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No active players selected for this session.
              <br />
              Go back and pick players first.
            </div>
          ) : (
            <PlayerSelector
              players={players}
              selectedIds={selectedIds}
              matchType={matchType}
              onToggle={(id) => toggleSelected(id, requiredCount)}
              onAddPlayer={handleAddPlayer}
              isAdding={createPlayer.isPending}
              teamAIds={teamAIds}
              teamBIds={teamBIds}
            />
          )}
        </section>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 max-w-lg mx-auto z-30 px-4 py-3">
        <button
          onClick={handleNext}
          disabled={!playersSelected}
          className={`w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            playersSelected
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/25'
              : 'bg-gray-200 text-gray-400'
          }`}
          style={{ minHeight: 56 }}
        >
          Next
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
