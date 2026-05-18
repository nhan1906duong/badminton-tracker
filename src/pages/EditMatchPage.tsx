import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMatch, useUpdateMatch } from '../hooks/useMatches'
import ScoreEntry from '../components/ScoreEntry'
import MatchTypeSelector from '../components/MatchTypeSelector'
import { Loader2, Save } from 'lucide-react'
import type { SetScore, MatchType } from '../types/database'

export default function EditMatchPage() {
  const { id: sessionId, matchId } = useParams<{ id: string; matchId: string }>()
  const navigate = useNavigate()
  const { data: match, isLoading } = useMatch(matchId ?? '')
  const updateMatch = useUpdateMatch()

  // Store only overrides from the original match data
  const [draft, setDraft] = useState<{
    matchType?: MatchType
    scores?: SetScore[]
    winner?: 'TEAM_A' | 'TEAM_B'
  }>({})
  const [error, setError] = useState('')

  if (isLoading) {
    return (
      <div className="min-h-svh bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-svh bg-gray-50 px-4 py-5">
        <p className="text-sm text-gray-400">Match not found.</p>
      </div>
    )
  }

  const teamA = match.participants.filter(
    (p) => match.teams.find((t) => t.id === p.team_id)?.team_label === 'TEAM_A'
  )
  const teamB = match.participants.filter(
    (p) => match.teams.find((t) => t.id === p.team_id)?.team_label === 'TEAM_B'
  )

  // Derive current values from match + draft overrides
  const matchType = draft.matchType ?? match.match_type
  const scores = draft.scores ?? match.scores.map((s) => ({
    set_number: s.set_number,
    team_a_score: s.team_a_score,
    team_b_score: s.team_b_score,
  }))
  const winner = draft.winner ?? match.teams.find((t) => t.is_winner)?.team_label

  async function handleSave() {
    setError('')
    if (!winner || !match) {
      if (!winner) setError('Please select the winner.')
      return
    }

    try {
      await updateMatch.mutateAsync({
        id: match.id,
        match_type: matchType,
        played_at: match.played_at,
        winner_team: winner,
        scores: scores.filter((s) => s.team_a_score > 0 || s.team_b_score > 0),
      })
      navigate(`/sessions/${sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update match')
    }
  }

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-6 pb-32">
        {/* Team Matchup (read-only) */}
        <section>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-4 flex items-center gap-3 [@media(max-width:380px)]:gap-2">
              <div className="flex-1 text-center min-w-0">
                <div className="w-10 h-10 [@media(max-width:380px)]:w-8 [@media(max-width:380px)]:h-8 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm [@media(max-width:380px)]:text-xs font-bold text-white">A</span>
                </div>
                <p className="text-[15px] font-bold text-gray-900 truncate">
                  {teamA.map((p) => p.player.name).join(' & ')}
                </p>
              </div>
              <span className="text-[10px] font-bold text-gray-300 shrink-0">VS</span>
              <div className="flex-1 text-center min-w-0">
                <div className="w-10 h-10 [@media(max-width:380px)]:w-8 [@media(max-width:380px)]:h-8 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm [@media(max-width:380px)]:text-xs font-bold text-white">B</span>
                </div>
                <p className="text-[15px] font-bold text-gray-900 truncate">
                  {teamB.map((p) => p.player.name).join(' & ')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Match Type */}
        <section className="space-y-3">
          <span className="text-sm font-bold text-gray-900">Match Type</span>
          <MatchTypeSelector
            value={matchType}
            onChange={(type) => setDraft((d) => ({ ...d, matchType: type }))}
          />
        </section>

        {/* Scores & Winner */}
        <section>
          <ScoreEntry
            scores={scores}
            onChange={(newScores) => setDraft((d) => ({ ...d, scores: newScores }))}
            winner={winner ?? null}
            onWinnerChange={(w) => setDraft((d) => ({ ...d, winner: w }))}
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
          disabled={updateMatch.isPending || !winner}
          className={`w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            winner
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/25'
              : 'bg-gray-200 text-gray-400'
          }`}
          style={{ minHeight: 56 }}
        >
          {updateMatch.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {updateMatch.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
