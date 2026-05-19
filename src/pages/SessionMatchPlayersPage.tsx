import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePlayers } from '../hooks/usePlayers'
import MatchTypeSelector from '../components/MatchTypeSelector'
import PlayerSelector from '../components/PlayerSelector'
import { getRequiredPlayerCount } from '../lib/match-helpers'
import { useNewMatchStore } from '../stores/new-match-store'
import { useSessionStore } from '../stores/session-store'

export default function SessionMatchPlayersPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: allPlayers, isLoading: playersLoading } = usePlayers()

  const matchType = useNewMatchStore((s) => s.matchType)
  const selectedIds = useNewMatchStore((s) => s.selectedIds)
  const teamAIds = useNewMatchStore((s) => s.teamAIds)
  const teamBIds = useNewMatchStore((s) => s.teamBIds)
  const setMatchType = useNewMatchStore((s) => s.setMatchType)
  const toggleSelected = useNewMatchStore((s) => s.toggleSelected)
  const clearPlayers = useNewMatchStore((s) => s.clearPlayers)

  const activePlayerIds = useSessionStore((s) =>
    sessionId ? s.activePlayers[sessionId] || [] : []
  )

  const requiredCount = getRequiredPlayerCount(matchType)
  const justMounted = useRef(true)

  // Clear any stale selections on mount so user always re-picks players
  useEffect(() => {
    clearPlayers()
  }, [clearPlayers])

  // Auto-navigate to result page once selection reaches required count
  useEffect(() => {
    if (justMounted.current) {
      justMounted.current = false
      return
    }
    if (selectedIds.length === requiredCount) {
      navigate(`/sessions/${sessionId}/matches/new/result`)
    }
  }, [selectedIds.length, requiredCount, navigate, sessionId])

  // Filter to session-active players if any are selected; otherwise show all
  const players = activePlayerIds.length > 0
    ? (allPlayers?.filter((p) => activePlayerIds.includes(p.id)) ?? [])
    : (allPlayers ?? [])

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-6">
        <section className="space-y-3">
          <MatchTypeSelector
            value={matchType}
            onChange={(type) => {
              setMatchType(type)
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
              teamAIds={teamAIds}
              teamBIds={teamBIds}
            />
          )}
        </section>
      </div>
    </div>
  )
}
