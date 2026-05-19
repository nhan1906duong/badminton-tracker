import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Player } from '../types/database'
import Avatar from './Avatar'
import ActivePlayersBottomSheet from './ActivePlayersBottomSheet'

interface ActivePlayersEditorProps {
  players: Player[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  isLoading?: boolean
}

export default function ActivePlayersEditor({
  players,
  selectedIds,
  onChange,
  isLoading,
}: ActivePlayersEditorProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  // Resolve chip data from selectedIds + roster (preserves chip order = selection order)
  const selectedPlayers = useMemo(
    () =>
      selectedIds
        .map((id) => players.find((p) => p.id === id))
        .filter((p): p is Player => !!p),
    [players, selectedIds],
  )

  // Addable = roster minus already-selected
  const addablePlayers = useMemo(
    () => players.filter((p) => !selectedIds.includes(p.id)),
    [players, selectedIds],
  )

  function handleRemove(id: string) {
    onChange(selectedIds.filter((s) => s !== id))
  }

  function handleConfirmAdd(ids: string[]) {
    onChange([...selectedIds, ...ids])
    setSheetOpen(false)
  }

  // Loading skeleton (only when nothing is selected yet)
  if (isLoading && selectedPlayers.length === 0) {
    return (
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-24 h-8 rounded-full bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {selectedPlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => handleRemove(player.id)}
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-green-600 text-white text-sm font-medium shadow-sm active:scale-95 transition-transform"
          >
            <Avatar
              src={player.avatar_url}
              name={player.name}
              size={24}
              bgColor="rgba(255,255,255,0.2)"
              textColor="#ffffff"
            />
            <span className="truncate max-w-[160px]">{player.name}</span>
          </button>
        ))}

        <button
          onClick={() => setSheetOpen(true)}
          disabled={addablePlayers.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-600 text-sm font-medium active:bg-gray-50 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          Add active player
        </button>
      </div>

      {sheetOpen && (
        <ActivePlayersBottomSheet
          players={addablePlayers}
          onClose={() => setSheetOpen(false)}
          onConfirm={handleConfirmAdd}
        />
      )}
    </>
  )
}
