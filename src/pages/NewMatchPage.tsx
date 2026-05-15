import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivePlayers, useCreatePlayer } from '../hooks/usePlayers'
import { useCreateMatch } from '../hooks/useMatches'
import MatchTypeSelector from '../components/MatchTypeSelector'
import PlayerSelector from '../components/PlayerSelector'
import ScoreEntry from '../components/ScoreEntry'
import { getRequiredPlayerCount, getTeamSize } from '../lib/match-helpers'
import type { MatchType, SetScore } from '../types/database'
import { Loader2, Trophy, ArrowRight, ArrowLeft } from 'lucide-react'

export default function NewMatchPage() {
  const navigate = useNavigate()
  const { data: players, isLoading: playersLoading } = useActivePlayers()
  const createPlayer = useCreatePlayer()
  const createMatch = useCreateMatch()

  const [step, setStep] = useState<1 | 2>(1)
  const [matchType, setMatchType] = useState<MatchType>('MEN_DOUBLES')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [teamAIds, setTeamAIds] = useState<string[]>([])
  const [teamBIds, setTeamBIds] = useState<string[]>([])
  const [scores, setScores] = useState<SetScore[]>([])
  const [winner, setWinner] = useState<'TEAM_A' | 'TEAM_B' | null>(null)
  const [error, setError] = useState('')

  const requiredCount = getRequiredPlayerCount(matchType)
  const teamSize = getTeamSize(matchType)
  const playersSelected = selectedIds.length === requiredCount

  const handleTogglePlayer = useCallback((id: string) => {
    setSelectedIds(prev => {
      const currentlySelected = prev.includes(id)
      let next: string[]

      if (currentlySelected) {
        next = prev.filter(pid => pid !== id)
      } else {
        if (prev.length >= requiredCount) return prev
        next = [...prev, id]
      }

      const teamA: string[] = []
      const teamB: string[] = []
      for (let i = 0; i < next.length; i++) {
        if (i < teamSize) {
          teamA.push(next[i])
        } else {
          teamB.push(next[i])
        }
      }
      setTeamAIds(teamA)
      setTeamBIds(teamB)

      return next
    })
  }, [requiredCount, teamSize])

  const handleMatchTypeChange = useCallback((type: MatchType) => {
    setMatchType(type)
    setSelectedIds([])
    setTeamAIds([])
    setTeamBIds([])
    setScores([])
    setWinner(null)
    setError('')
  }, [])

  async function handleAddPlayer(name: string) {
    try {
      const player = await createPlayer.mutateAsync({ name })
      const newSelected = [...selectedIds, player.id]
      if (newSelected.length <= requiredCount) {
        setSelectedIds(newSelected)
        const teamA: string[] = []
        const teamB: string[] = []
        for (let i = 0; i < newSelected.length; i++) {
          if (i < teamSize) {
            teamA.push(newSelected[i])
          } else {
            teamB.push(newSelected[i])
          }
        }
        setTeamAIds(teamA)
        setTeamBIds(teamB)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add player')
    }
  }

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
        scores: scores.filter(s => s.team_a_score > 0 || s.team_b_score > 0),
      })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save match')
    }
  }

  const teamAPlayers = teamAIds.map(id => players?.find(p => p.id === id)).filter(Boolean)
  const teamBPlayers = teamBIds.map(id => players?.find(p => p.id === id)).filter(Boolean)

  // ─── STEP 1: SELECT PLAYERS ───
  if (step === 1) {
    return (
      <div className="min-h-svh bg-gray-50">
        <div className="px-4 py-5 space-y-6 pb-32">
          {/* Match Type */}
          <section className="space-y-3">
            <MatchTypeSelector value={matchType} onChange={handleMatchTypeChange} />
          </section>

          {/* Players */}
          <section className="space-y-3">
            <span className="text-sm font-bold text-gray-900">Select Players</span>

            {playersLoading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading players...</div>
            ) : (
              <PlayerSelector
                players={players ?? []}
                selectedIds={selectedIds}
                matchType={matchType}
                onToggle={handleTogglePlayer}
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

        {/* Bottom Next button */}
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 max-w-lg mx-auto z-30 px-4 py-3">
          <button
            onClick={() => {
              if (!playersSelected) {
                setError(`Please select ${requiredCount} players.`)
                return
              }
              setError('')
              setStep(2)
            }}
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

  // ─── STEP 2: SCORES & WINNER ───
  return (
    <div className="min-h-svh bg-gray-50">
      {/* Step 2 sub-header */}
      <div className="sticky top-12 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => {
              setStep(1)
              setError('')
            }}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 active:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-200" />
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
        </div>
      </div>

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
                  {teamAPlayers.map(p => p?.name).join(' & ')}
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
                  {teamBPlayers.map(p => p?.name).join(' & ')}
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
