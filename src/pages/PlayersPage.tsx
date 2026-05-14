import { useState } from 'react'
import { usePlayers, useTogglePlayerActive } from '../hooks/usePlayers'
import { Plus, User, UserCheck, UserX } from 'lucide-react'
import PlayerForm from '../components/PlayerForm'

export default function PlayersPage() {
  const { data: players, isLoading } = usePlayers()
  const toggleActive = useTogglePlayerActive()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const filtered = players?.filter(p => {
    if (filter === 'active') return p.is_active
    if (filter === 'inactive') return !p.is_active
    return true
  })

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Players</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
              filter === f
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading players...</div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <User className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No players yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-green-600 text-sm mt-1 hover:underline"
          >
            Add your first player
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered?.map(player => (
            <div
              key={player.id}
              className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-green-700">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{player.name}</p>
                {player.email && (
                  <p className="text-xs text-gray-400 truncate">{player.email}</p>
                )}
              </div>
              <button
                onClick={() => {
                  toggleActive.mutate({ id: player.id, is_active: !player.is_active })
                }}
                className={`p-1.5 rounded-lg ${
                  player.is_active
                    ? 'text-green-600 hover:bg-green-50'
                    : 'text-gray-400 hover:bg-gray-50'
                }`}
                title={player.is_active ? 'Active' : 'Inactive'}
              >
                {player.is_active ? (
                  <UserCheck className="w-4 h-4" />
                ) : (
                  <UserX className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && <PlayerForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
