import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePlayers } from '../hooks/usePlayers'
import { useCreateMatch, useMatches } from '../hooks/useMatches'
import ScoreEntry from '../components/ScoreEntry'
import Avatar from '../components/Avatar'
import { getRequiredPlayerCount, MATCH_TYPE_SHORT } from '../lib/match-helpers'
import { useNewMatchStore } from '../stores/new-match-store'
import { Loader2 } from 'lucide-react'

export default function SessionMatchResultPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: players } = usePlayers()
  const { data: matches } = useMatches(sessionId)
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

  const requiredCount = getRequiredPlayerCount(matchType)
  const flowReady = selectedIds.length === requiredCount

  useEffect(() => {
    if (!flowReady) navigate(`/sessions/${sessionId}/matches/new`, { replace: true })
  }, [flowReady, navigate, sessionId])

  if (!flowReady || !sessionId) return null

  const sid = sessionId

  const teamAPlayers = teamAIds.map((id) => players?.find((p) => p.id === id)).filter(Boolean)
  const teamBPlayers = teamBIds.map((id) => players?.find((p) => p.id === id)).filter(Boolean)
  const matchNumber = (matches?.length ?? 0) + 1

  async function handleSave() {
    setError('')
    if (!winner) {
      setError('Please select the winner.')
      return
    }

    try {
      await createMatch.mutateAsync({
        session_id: sid,
        match_type: matchType,
        played_at: new Date().toISOString(),
        team_a_player_ids: teamAIds,
        team_b_player_ids: teamBIds,
        winner_team: winner,
        scores: scores.filter((s) => s.team_a_score > 0 || s.team_b_score > 0),
      })
      reset()
      navigate(`/sessions/${sid}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save match')
    }
  }

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-6 pb-32">
        {/* Team Matchup */}
        <section>
          <div className="relative bg-white border border-gray-100 rounded-2xl p-4">
            {/* Match type tag */}
            <div className="absolute top-1.5 right-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                {MATCH_TYPE_SHORT[matchType]}
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              {/* Match Number */}
              <div className="shrink-0 flex flex-col justify-center self-stretch">
                <span className="text-xs font-bold text-red-500">M{matchNumber}</span>
              </div>

              {/* Team A */}
              <div className="flex-1 min-w-0 self-stretch">
                <div className="flex flex-col items-end justify-center gap-2 h-full">
                  {teamAPlayers.map((p) => (
                    <div key={p?.id} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {p?.name}
                      </span>
                      <Avatar
                        src={p?.avatar_url}
                        name={p?.name ?? ''}
                        size={22}
                        bgColor="#f3f4f6"
                        textColor="#6b7280"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* VS */}
              <div className="text-center shrink-0 px-2">
                <span className="text-xs text-gray-300 font-bold">vs</span>
              </div>

              {/* Team B */}
              <div className="flex-1 min-w-0 self-stretch">
                <div className="flex flex-col items-start justify-center gap-2 h-full">
                  {teamBPlayers.map((p) => (
                    <div key={p?.id} className="flex items-center gap-2">
                      <Avatar
                        src={p?.avatar_url}
                        name={p?.name ?? ''}
                        size={22}
                        bgColor="#f3f4f6"
                        textColor="#6b7280"
                      />
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {p?.name}
                      </span>
                    </div>
                  ))}
                </div>
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
          {createMatch.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
          {createMatch.isPending ? 'Saving...' : 'Save Match'}
        </button>
      </div>
    </div>
  )
}
