import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivePlayers } from '../hooks/usePlayers'
import { useCreateMatch } from '../hooks/useMatches'
import ScoreEntry from '../components/ScoreEntry'
import { getRequiredPlayerCount } from '../lib/match-helpers'
import { useNewMatchStore } from '../stores/new-match-store'
import { Loader2, Trophy } from 'lucide-react'

export default function FinalResultPage() {
  const navigate = useNavigate()
  const { data: players } = useActivePlayers()
  const createMatch = useCreateMatch()

  const matchType = useNewMatchStore((s) => s.matchType)
  const teamAIds = useNewMatchStore((s) => s.teamAIds)
  const teamBIds = useNewMatchStore((s) => s.teamBIds)
  const selectedIds = useNewMatchStore((s) => s.selectedIds)
  const scores = useNewMatchStore((s) => s.scores)
  const winner = useNewMatchStore((s) => s.winner)
  const setScores = useNewMatchStore((s) => s.setScores)
  const setWinner = useNewMatchStore((s) => s.setWinner)
  const reset = useNewMatchStore((s) => s.reset)

  const [error, setError] = useState('')

  // Guard: if user lands here without completing player selection,
  // bounce back to the select players step.
  const requiredCount = getRequiredPlayerCount(matchType)
  const flowReady = selectedIds.length === requiredCount

  useEffect(() => {
    if (!flowReady) navigate('/matches/new', { replace: true })
  }, [flowReady, navigate])

  if (!flowReady) return null

  const teamAPlayers = teamAIds.map((id) => players?.find((p) => p.id === id)).filter(Boolean)
  const teamBPlayers = teamBIds.map((id) => players?.find((p) => p.id === id)).filter(Boolean)

  async function handleSave() {
    setError('')
    if (!winner) {
      setError('Please select the winner.')
      return
    }

    try {
      await createMatch.mutateAsync({
        match_type: matchType,
        played_at: new Date().toISOString(),
        team_a_player_ids: teamAIds,
        team_b_player_ids: teamBIds,
        winner_team: winner,
        scores: scores.filter((s) => s.team_a_score > 0 || s.team_b_score > 0),
      })
      reset()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save match')
    }
  }

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-6 pb-32">
        {/* Team Matchup */}
        <section>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-4 flex items-center gap-4">
              {/* Team A */}
              <div className="flex-1 text-center">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm font-bold text-white">A</span>
                </div>
                <p className="text-[15px] font-bold text-gray-900">
                  {teamAPlayers.map((p) => p?.name).join(' & ')}
                </p>
              </div>
              {/* VS */}
              <span className="text-[10px] font-bold text-gray-300">VS</span>
              {/* Team B */}
              <div className="flex-1 text-center">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm font-bold text-white">B</span>
                </div>
                <p className="text-[15px] font-bold text-gray-900">
                  {teamBPlayers.map((p) => p?.name).join(' & ')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Scores & Winner */}
        <section>
          <ScoreEntry
            scores={scores}
            onChange={setScores}
            winner={winner}
            onWinnerChange={setWinner}
          />
        </section>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Bottom Save button */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 max-w-lg mx-auto z-30 px-4 py-3">
        <button
          onClick={handleSave}
          disabled={createMatch.isPending || !winner}
          className={`w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            winner
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/25'
              : 'bg-gray-200 text-gray-400'
          }`}
          style={{ minHeight: 56 }}
        >
          {createMatch.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Trophy className="w-5 h-5" />
          )}
          {createMatch.isPending ? 'Saving...' : 'Save Match'}
        </button>
      </div>
    </div>
  )
}
