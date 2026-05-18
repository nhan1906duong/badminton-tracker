import { useState } from 'react'
import type { Player, MatchType } from '../types/database'
import { getRequiredPlayerCount } from '../lib/match-helpers'
import { Check, Plus, User } from 'lucide-react'
import Avatar from './Avatar'

interface PlayerSelectorProps {
  players: Player[]
  selectedIds: string[]
  matchType: MatchType
  onToggle: (id: string) => void
  onAddPlayer?: (name: string) => void
  isAdding?: boolean
  teamAIds: string[]
  teamBIds: string[]
}

export default function PlayerSelector({
  players,
  selectedIds,
  matchType,
  onToggle,
  onAddPlayer,
  isAdding,
  teamAIds,
  teamBIds,
}: PlayerSelectorProps) {
  const required = getRequiredPlayerCount(matchType)
  const [newName, setNewName] = useState('')
  const [showInput, setShowInput] = useState(false)

  const activePlayers = players.filter(p => p.is_active)

  return (
    <div className="space-y-4">
      {/* Player grid */}
      <div className="grid grid-cols-2 gap-2.5 [@media(max-width:380px)]:gap-2">
        {activePlayers.map(player => {
          const isSelected = selectedIds.includes(player.id)
          const team = teamAIds.includes(player.id) ? 'A' : teamBIds.includes(player.id) ? 'B' : null
          const isDisabled = !isSelected && selectedIds.length >= required

          return (
            <button
              key={player.id}
              onClick={() => !isDisabled && onToggle(player.id)}
              disabled={isDisabled}
              className={`relative flex items-center gap-2 px-3.5 py-3.5 [@media(max-width:380px)]:px-2.5 [@media(max-width:380px)]:py-2.5 rounded-2xl border text-left transition-all active:scale-[0.97] ${
                isSelected
                  ? team === 'A'
                    ? 'bg-blue-50 border-blue-400 shadow-sm'
                    : 'bg-red-50 border-red-400 shadow-sm'
                  : isDisabled
                    ? 'bg-gray-50 border-gray-100 opacity-50'
                    : 'bg-white border-gray-200 active:bg-gray-50'
              }`}
              style={{ minHeight: 56 }}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar
                  src={player.avatar_url}
                  name={player.name}
                  size={40}
                  className="[@media(max-width:380px)]:w-8 [@media(max-width:380px)]:h-8"
                  bgColor={isSelected ? (team === 'A' ? '#3b82f6' : '#ef4444') : '#f3f4f6'}
                  textColor={isSelected ? '#ffffff' : '#9ca3af'}
                />
                {isSelected && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Check className="w-3 h-3 text-green-500" />
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-semibold truncate ${
                  isSelected
                    ? team === 'A' ? 'text-blue-900' : 'text-red-900'
                    : 'text-gray-700'
                }`}>
                  {player.name}
                </p>
                {isSelected && (
                  <p className={`text-xs font-medium ${
                    team === 'A' ? 'text-blue-500' : 'text-red-500'
                  }`}>
                    Team {team}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Add new player */}
      {showInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Player name"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && newName.trim() && onAddPlayer) {
                onAddPlayer(newName.trim())
                setNewName('')
              }
              if (e.key === 'Escape') {
                setNewName('')
                setShowInput(false)
              }
            }}
            className="flex-1 px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            style={{ minHeight: 52 }}
          />
          <button
            onClick={() => {
              if (newName.trim() && onAddPlayer) {
                onAddPlayer(newName.trim())
                setNewName('')
              }
            }}
            disabled={!newName.trim() || isAdding}
            className="px-5 py-3.5 bg-green-600 text-white rounded-2xl text-[15px] font-semibold active:bg-green-700 disabled:opacity-50"
            style={{ minHeight: 52 }}
          >
            {isAdding ? '...' : 'Add'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center gap-2 text-green-600 text-[15px] font-semibold active:opacity-70"
          style={{ minHeight: 44 }}
        >
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          Add new player
        </button>
      )}
    </div>
  )
}
