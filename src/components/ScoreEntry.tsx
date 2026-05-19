import { useCallback } from 'react'
import type { SetScore } from '../types/database'
import { Plus, Trash2 } from 'lucide-react'

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
    <div className="space-y-4">
      {/* Scores section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Set Scores</span>
          <button
            onClick={addSet}
            disabled={scores.length >= 5}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 rounded-xl active:bg-green-100 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Set
          </button>
        </div>

        {scores.length === 0 ? (
          <button
            onClick={addSet}
            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 font-medium active:bg-gray-50 transition-colors"
          >
            Tap to add set scores
          </button>
        ) : (
          <div className="space-y-2">
            {scores.map((set, i) => (
              <div key={i} className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <span className="text-xs font-bold text-gray-400 w-10 shrink-0">Set {set.set_number}</span>

                <div className="flex items-center gap-2 flex-1 justify-center">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={set.team_a_score}
                    onChange={e => updateSet(i, 'team_a_score', e.target.value)}
                    className="w-16 h-11 [@media(max-width:380px)]:w-14 text-center bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                  <span className="text-sm text-gray-300 font-bold">-</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={set.team_b_score}
                    onChange={e => updateSet(i, 'team_b_score', e.target.value)}
                    className="w-16 h-11 [@media(max-width:380px)]:w-14 text-center bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                <button
                  onClick={() => removeSet(i)}
                  className="p-2.5 text-gray-300 active:text-red-500 active:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Winner selection */}
      <div className="space-y-3 pt-2">
        <span className="text-sm font-semibold text-gray-700">Winner</span>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onWinnerChange('TEAM_A')}
            className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-semibold border-2 transition-all active:scale-[0.97] ${
              winner === 'TEAM_A'
                ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                : 'bg-white text-gray-700 border-gray-200 active:bg-gray-50'
            }`}
            style={{ minHeight: 56 }}
          >
            Team A
          </button>
          <button
            onClick={() => onWinnerChange('TEAM_B')}
            className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-semibold border-2 transition-all active:scale-[0.97] ${
              winner === 'TEAM_B'
                ? 'bg-red-500 text-white border-red-500 shadow-sm'
                : 'bg-white text-gray-700 border-gray-200 active:bg-gray-50'
            }`}
            style={{ minHeight: 56 }}
          >
            Team B
          </button>
        </div>
      </div>
    </div>
  )
}
