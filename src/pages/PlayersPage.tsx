import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayers, useDeletePlayer } from '../hooks/usePlayers'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { Plus, Trash2, User } from 'lucide-react'
import { SwipeableItem } from '../components/SwipeableItem'
import PlayerForm from '../components/PlayerForm'
import FloatingActionButton from '../components/FloatingActionButton'
import Avatar from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'
import { useAvatarUpload, useAvatarDelete, useSetDefaultAvatar } from '../hooks/useAvatarUpload'
import type { Player } from '../types/database'

export default function PlayersPage() {
  const navigate = useNavigate()
  const { data: players, isLoading } = usePlayers()
  const { stats, isLoading: statsLoading } = usePlayerStats()
  const deletePlayer = useDeletePlayer()
  const [showForm, setShowForm] = useState(false)
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editAvatarPlayer, setEditAvatarPlayer] = useState<Player | null>(null)

  const upload = useAvatarUpload()
  const remove = useAvatarDelete()
  const setDefault = useSetDefaultAvatar()

  const statsMap = new Map(stats.map((s) => [s.playerId, s]))

  const sortedPlayers = [...(players ?? [])].sort((a, b) => {
    const aStats = statsMap.get(a.id)
    const bStats = statsMap.get(b.id)
    return (bStats?.matchesPlayed ?? 0) - (aStats?.matchesPlayed ?? 0)
  })

  async function handleDelete(id: string) {
    setSwipedId(null)
    try {
      await deletePlayer.mutateAsync(id)
      setConfirmDeleteId(null)
    } catch {
      // handled by mutation
    }
  }

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-3 pb-32">
        {isLoading || statsLoading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading players...</div>
        ) : sortedPlayers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">No players yet.</p>
          </div>
        ) : (
          sortedPlayers.map((player) => {
            const s = statsMap.get(player.id)
            return (
              <SwipeableItem
                key={player.id}
                isOpen={swipedId === player.id}
                onOpen={() => setSwipedId(player.id)}
                onClose={() => setSwipedId(null)}
                onClick={() => navigate(`/players/${player.id}`)}
                renderAction={() => (
                  <button
                    onClick={() => setConfirmDeleteId(player.id)}
                    className="flex flex-col items-center gap-0.5 text-white"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-[10px] font-semibold">Delete</span>
                  </button>
                )}
              >
                <div className="relative bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3 select-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditAvatarPlayer(player)
                    }}
                    className="shrink-0"
                  >
                    <Avatar
                      src={player.avatar_url}
                      name={player.name}
                      size={40}
                      bgColor="#dcfce7"
                      textColor="#15803d"
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{player.name}</p>
                    <p className="text-xs text-gray-400">
                      {s?.matchesPlayed ?? 0} matches · {s?.wins ?? 0} wins
                    </p>
                  </div>
                </div>
              </SwipeableItem>
            )
          })
        )}
      </div>

      {/* FAB Add Player */}
      <FloatingActionButton
        onClick={() => setShowForm(true)}
        icon={<Plus className="w-6 h-6" />}
        ariaLabel="Add player"
      />

      {/* Add player modal */}
      {showForm && <PlayerForm onClose={() => setShowForm(false)} />}

      {/* Avatar Picker */}
      {editAvatarPlayer && (
        <AvatarPicker
          currentAvatarUrl={editAvatarPlayer.avatar_url}
          onSelect={(file) =>
            upload.mutate({ file, entity: 'players', id: editAvatarPlayer.id })
          }
          onSelectDefault={(url) =>
            setDefault.mutate({ url, entity: 'players', id: editAvatarPlayer.id, oldAvatarUrl: editAvatarPlayer.avatar_url })
          }
          onRemove={() =>
            remove.mutate({ entity: 'players', id: editAvatarPlayer.id, oldAvatarUrl: editAvatarPlayer.avatar_url })
          }
          onClose={() => setEditAvatarPlayer(null)}
        />
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[15px] font-bold text-gray-900">Delete Player?</p>
            <p className="text-sm text-gray-500">
              This will remove the player permanently.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 active:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletePlayer.isPending}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-600 text-white active:bg-red-700 disabled:opacity-50"
              >
                {deletePlayer.isPending ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
