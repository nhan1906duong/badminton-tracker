import type { Player, MatchType } from '../types/database'
import { getRequiredPlayerCount } from '../lib/match-helpers'
import { Check } from 'lucide-react'

interface PlayerSelectorProps {
  players: Player[]
  selectedIds: string[]
  matchType: MatchType
  onToggle: (id: string) => void
}

export default function PlayerSelector({ players, selectedIds, matchType, onToggle }: PlayerSelectorProps) {
  const required = getRequiredPlayerCount(matchType)
  const activePlayers = players.filter(p => p.is_active)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Select Players</label>
        <span className={`text-xs font-medium ${selectedIds.length === required ? 'text-green-600' : 'text-gray-400'}`}>
          {selectedIds.length}/{required}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {activePlayers.map(player => {
          const isSelected = selectedIds.includes(player.id)
          return (
            <button
              key={player.id}
              onClick={() => onToggle(player.id)}
              disabled={!isSelected && selectedIds.length >= required}
              className={`relative flex items-center gap-2 p-3 rounded-xl border text-left transition-colors ${
                isSelected
                  ? 'bg-green-50 border-green-500 text-green-900'
                  : selectedIds.length >= required
                    ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
              }`}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-green-700">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium truncate pr-4">{player.name}</span>
            </button>
          )
        })}
      </div>

      {activePlayers.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          No active players. Add players first.
        </p>
      )}
    </div>
  )
}
