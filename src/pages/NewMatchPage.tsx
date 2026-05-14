import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivePlayers } from '../hooks/usePlayers'
import { useCreateMatch } from '../hooks/useMatches'
import MatchTypeSelector from '../components/MatchTypeSelector'
import PlayerSelector from '../components/PlayerSelector'
import TeamAssignment from '../components/TeamAssignment'
import ScoreEntry from '../components/ScoreEntry'
import { getRequiredPlayerCount, getTeamSize, shuffleArray } from '../lib/match-helpers'
import type { MatchType, SetScore } from '../types/database'
import { ArrowLeft, Loader2, Trophy } from 'lucide-react'

export default function NewMatchPage() {
  const navigate = useNavigate()
  const { data: players, isLoading: playersLoading } = useActivePlayers()
  const createMatch = useCreateMatch()

  const [matchType, setMatchType] = useState<MatchType>('MEN_DOUBLES')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [teamAIds, setTeamAIds] = useState<string[]>([])
  const [teamBIds, setTeamBIds] = useState<string[]>([])
  const [scores, setScores] = useState<SetScore[]>([])
  const [winner, setWinner] = useState<'TEAM_A' | 'TEAM_B' | null>(null)
  const [error, setError] = useState('')

  const requiredCount = getRequiredPlayerCount(matchType)
  const teamSize = getTeamSize(matchType)

  const handleTogglePlayer = useCallback((id: string) => {
    setSelectedIds(prev => {
      const currentlySelected = prev.includes(id)
      if (currentlySelected) {
        return prev.filter(pid => pid !== id)
      }
      if (prev.length >= requiredCount) return prev
      return [...prev, id]
    })
    // Also remove from teams if deselected
    setTeamAIds(prev => prev.filter(pid => pid !== id))
    setTeamBIds(prev => prev.filter(pid => pid !== id))
  }, [requiredCount])

  const handleShuffle = useCallback(() => {
    const shuffled = shuffleArray(selectedIds)
    setTeamAIds(shuffled.slice(0, teamSize))
    setTeamBIds(shuffled.slice(teamSize, teamSize * 2))
  }, [selectedIds, teamSize])

  const handleMoveToTeam = useCallback((playerId: string, team: 'A' | 'B') => {
    if (team === 'A') {
      if (teamAIds.length >= teamSize) return
      setTeamAIds(prev => [...prev, playerId])
      setTeamBIds(prev => prev.filter(id => id !== playerId))
    } else {
      if (teamBIds.length >= teamSize) return
      setTeamBIds(prev => [...prev, playerId])
      setTeamAIds(prev => prev.filter(id => id !== playerId))
    }
  }, [teamAIds.length, teamBIds.length, teamSize])

  const handleMatchTypeChange = useCallback((type: MatchType) => {
    setMatchType(type)
    setSelectedIds([])
    setTeamAIds([])
    setTeamBIds([])
    setScores([])
    setWinner(null)
  }, [])

  async function handleSave() {
    setError('')

    if (selectedIds.length !== requiredCount) {
      setError(`Please select exactly ${requiredCount} players.`)
      return
    }
    if (teamAIds.length !== teamSize || teamBIds.length !== teamSize) {
      setError(`Assign ${teamSize} player${teamSize > 1 ? 's' : ''} to each team.`)
      return
    }
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

  const playersSelected = selectedIds.length === requiredCount
  const teamsAssigned = teamAIds.length === teamSize && teamBIds.length === teamSize

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">New Match</h2>
      </div>

      <div className="space-y-6">
        {/* Step 1: Match Type */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">1</div>
            <span className="text-sm font-semibold text-gray-700">Match Type</span>
          </div>
          <MatchTypeSelector value={matchType} onChange={handleMatchTypeChange} />
        </section>

        {/* Step 2: Select Players */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${playersSelected ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>2</div>
            <span className="text-sm font-semibold text-gray-700">Select Players</span>
          </div>
          {playersLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading players...</div>
          ) : (
            <PlayerSelector
              players={players ?? []}
              selectedIds={selectedIds}
              matchType={matchType}
              onToggle={handleTogglePlayer}
            />
          )}
        </section>

        {/* Step 3: Team Assignment */}
        {playersSelected && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${teamsAssigned ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>3</div>
              <span className="text-sm font-semibold text-gray-700">Assign Teams</span>
            </div>
            <TeamAssignment
              players={players ?? []}
              selectedIds={selectedIds}
              teamAIds={teamAIds}
              teamBIds={teamBIds}
              matchType={matchType}
              onShuffle={handleShuffle}
              onMoveToTeam={handleMoveToTeam}
            />
          </section>
        )}

        {/* Step 4: Scores + Winner */}
        {teamsAssigned && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${winner ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>4</div>
              <span className="text-sm font-semibold text-gray-700">Scores &amp; Winner</span>
            </div>
            <ScoreEntry
              scores={scores}
              onChange={setScores}
              winner={winner}
              onWinnerChange={setWinner}
            />
          </section>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={createMatch.isPending || !winner}
          className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {createMatch.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trophy className="w-4 h-4" />
          )}
          {createMatch.isPending ? 'Saving...' : 'Save Match'}
        </button>
      </div>
    </div>
  )
}
