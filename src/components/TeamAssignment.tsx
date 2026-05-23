import { useMemo } from 'react'
import type { Player, MatchType } from '../types/database'
import { getTeamSize } from '../lib/match-helpers'
import { formatShortPlayerName } from '../lib/player-name'
import { Shuffle } from 'lucide-react'

interface TeamAssignmentProps {
  players: Player[]
  selectedIds: string[]
  teamAIds: string[]
  teamBIds: string[]
  matchType: MatchType
  onShuffle: () => void
  onMoveToTeam: (playerId: string, team: 'A' | 'B') => void
}

export default function TeamAssignment({
  players,
  selectedIds,
  teamAIds,
  teamBIds,
  matchType,
  onShuffle,
  onMoveToTeam,
}: TeamAssignmentProps) {
  const teamSize = getTeamSize(matchType)
  const selected = useMemo(() =>
    selectedIds.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[],
    [selectedIds, players]
  )

  const unassigned = selected.filter(p => !teamAIds.includes(p.id) && !teamBIds.includes(p.id))

  function PlayerChip({ player, team }: { player: Player; team?: 'A' | 'B' }) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
          team === 'A'
            ? 'bg-blue-50 text-blue-800 border border-blue-200'
            : team === 'B'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-gray-50 text-gray-600 border border-gray-200'
        }`}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          team === 'A'
            ? 'bg-blue-200 text-blue-700'
            : team === 'B'
              ? 'bg-red-200 text-red-700'
              : 'bg-gray-200 text-gray-600'
        }`}>
          {player.name.charAt(0).toUpperCase()}
        </div>
        <span className="truncate">{formatShortPlayerName(player.name)}</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Team Assignment</label>
        <button
          onClick={onShuffle}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
        >
          <Shuffle className="w-3 h-3" />
          Shuffle
        </button>
      </div>

      {/* Team A */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Team A</span>
          <span className="text-xs text-blue-400">{teamAIds.length}/{teamSize}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-[40px]">
          {teamAIds.map(id => {
            const p = players.find(pl => pl.id === id)
            return p ? <PlayerChip key={id} player={p} team="A" /> : null
          })}
          {teamAIds.length === 0 && <span className="text-xs text-blue-300 italic">Empty</span>}
        </div>
      </div>

      {/* VS */}
      <div className="text-center text-xs font-bold text-gray-300 uppercase tracking-widest">vs</div>

      {/* Team B */}
      <div className="bg-red-50/50 border border-red-100 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Team B</span>
          <span className="text-xs text-red-400">{teamBIds.length}/{teamSize}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-[40px]">
          {teamBIds.map(id => {
            const p = players.find(pl => pl.id === id)
            return p ? <PlayerChip key={id} player={p} team="B" /> : null
          })}
          {teamBIds.length === 0 && <span className="text-xs text-red-300 italic">Empty</span>}
        </div>
      </div>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-2">Click to assign:</p>
          <div className="flex flex-wrap gap-1.5">
            {unassigned.map(player => (
              <button
                key={player.id}
                onClick={() => onMoveToTeam(player.id, teamAIds.length < teamSize ? 'A' : 'B')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:border-green-400 hover:text-green-700 transition-colors"
              >
                {formatShortPlayerName(player.name)}
                <span className="text-[10px] text-gray-400">→ {teamAIds.length < teamSize ? 'A' : 'B'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
