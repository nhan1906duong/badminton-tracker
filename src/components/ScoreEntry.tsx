import { useCallback } from 'react'
import type { SetScore } from '../types/database'
import { Plus, Trash2, Trophy } from 'lucide-react'

interface ScoreEntryProps {
  scores: SetScore[]
  onChange: (scores: SetScore[]) => void
  winner: 'TEAM_A' | 'TEAM_B' | null
  onWinnerChange: (winner: 'TEAM_A' | 'TEAM_B') => void
}

function calculateWinner(scores: SetScore[]): 'TEAM_A' | 'TEAM_B' | null {
  if (scores.length === 0) return null
  let teamAWins = 0
  let teamBWins = 0
  for (const s of scores) {
    if (s.team_a_score > s.team_b_score) teamAWins++
    else if (s.team_b_score > s.team_a_score) teamBWins++
  }
  const needed = scores.length <= 3 ? 2 : 3
  if (teamAWins >= needed) return 'TEAM_A'
  if (teamBWins >= needed) return 'TEAM_B'
  return null
}

export default function ScoreEntry({ scores, onChange, winner, onWinnerChange }: ScoreEntryProps) {
  const applyScores = useCallback((newScores: SetScore[]) => {
    onChange(newScores)
    const autoWinner = calculateWinner(newScores)
    if (autoWinner && autoWinner !== winner) {
      onWinnerChange(autoWinner)
    }
  }, [onChange, onWinnerChange, winner])

  function addSet() {
    if (scores.length >= 5) return
    applyScores([
      ...scores,
      { set_number: scores.length + 1, team_a_score: 0, team_b_score: 0 },
    ])
  }

  function updateSet(index: number, field: 'team_a_score' | 'team_b_score', rawValue: string) {
    const value = parseInt(rawValue, 10)
    if (isNaN(value)) return
    const updated = [...scores]
    updated[index] = { ...updated[index], [field]: Math.max(0, value) }
    applyScores(updated)
  }

  function removeSet(index: number) {
    const updated = scores.filter((_, i) => i !== index).map((s, i) => ({ ...s, set_number: i + 1 }))
    applyScores(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Scores (optional)</label>
        <button
          onClick={addSet}
          disabled={scores.length >= 5}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-40"
        >
          <Plus className="w-3 h-3" />
          Add Set
        </button>
      </div>

      {scores.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No scores added. Winner must be selected manually.</p>
      ) : (
        <div className="space-y-2">
          {scores.map((set, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
              <span className="text-xs font-bold text-gray-400 w-10 text-center">Set {set.set_number}</span>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number"
                  min={0}
                  value={set.team_a_score}
                  onChange={e => updateSet(i, 'team_a_score', e.target.value)}
                  className="w-14 text-center py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-400 font-bold">-</span>
                <input
                  type="number"
                  min={0}
                  value={set.team_b_score}
                  onChange={e => updateSet(i, 'team_b_score', e.target.value)}
                  className="w-14 text-center py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                onClick={() => removeSet(i)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Winner selection */}
      <div className="pt-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">Winner</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onWinnerChange('TEAM_A')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
              winner === 'TEAM_A'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Team A
          </button>
          <button
            onClick={() => onWinnerChange('TEAM_B')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
              winner === 'TEAM_B'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Team B
          </button>
        </div>
      </div>
    </div>
  )
}
