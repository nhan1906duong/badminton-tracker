import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Check, X } from 'lucide-react'
import type { Player } from '../types/database'
import Avatar from './Avatar'

interface ActivePlayersBottomSheetProps {
  players: Player[]
  onClose: () => void
  onConfirm: (selectedIds: string[]) => void
}

const ROW_HEIGHT = 64

// iOS-style multi-select circle indicator
function CircleIndicator({ selected }: { selected: boolean }) {
  return (
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0 ${
        selected ? 'bg-green-600' : 'border-2 border-gray-300 bg-white'
      }`}
    >
      {selected && <Check className="w-3.5 h-3.5 text-white" />}
    </div>
  )
}

export default function ActivePlayersBottomSheet({
  players,
  onClose,
  onConfirm,
}: ActivePlayersBottomSheetProps) {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const parentRef = useRef<HTMLDivElement>(null)

  // Lock body scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const rowVirtualizer = useVirtualizer({
    count: players.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAdd() {
    onConfirm(Array.from(picked))
  }

  const isEmpty = players.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative w-full max-w-md bg-white rounded-t-2xl flex flex-col max-h-[75svh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-2 mb-1" />

        {/* Header: X | spacer | Add */}
        <div className="flex items-center px-3 py-2 border-b border-gray-100">
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full active:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1" />
          <button
            onClick={handleAdd}
            disabled={picked.size === 0}
            className="px-4 py-2 rounded-full border border-green-600 text-green-600 text-sm font-semibold active:bg-green-50 disabled:opacity-40 disabled:border-gray-300 disabled:text-gray-400"
          >
            Add{picked.size > 0 ? ` (${picked.size})` : ''}
          </button>
        </div>

        {/* Virtualized player list */}
        {isEmpty ? (
          <div className="py-12 text-center text-sm text-gray-400">
            All players are already active.
          </div>
        ) : (
          <div ref={parentRef} className="flex-1 overflow-auto">
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
                width: '100%',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((row) => {
                const player = players[row.index]
                const isPicked = picked.has(player.id)
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePick(player.id)}
                    className="absolute top-0 left-0 w-full flex items-center gap-3 px-4 active:bg-gray-50 transition-colors"
                    style={{
                      height: `${row.size}px`,
                      transform: `translateY(${row.start}px)`,
                    }}
                  >
                    <Avatar
                      src={player.avatar_url}
                      name={player.name}
                      size={40}
                    />
                    <span className="flex-1 text-left text-[15px] font-medium text-gray-900 truncate">
                      {player.name}
                    </span>
                    <CircleIndicator selected={isPicked} />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
