import { useState, useRef, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { usePlayer, useUpdatePlayer } from '../hooks/usePlayers'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { useBestPartner } from '../hooks/useBestPartner'
import { usePlayerMatches } from '../hooks/usePlayerMatches'
import { useAvatarUpload, useAvatarDelete, useSetDefaultAvatar } from '../hooks/useAvatarUpload'
import Avatar from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'
import MatchCard from '../components/MatchCard'
import { formatCurrency, LOSS_PENALTY_VND } from '../lib/currency'
import { formatShortPlayerName } from '../lib/player-name'
import { Trophy, Users, TrendingUp, TrendingDown, Medal, Pencil } from 'lucide-react'

export default function PlayerDetailPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const id = playerId ?? ''

  const { data: player, isLoading: playerLoading, isError: playerError } = usePlayer(id)
  const { stats } = usePlayerStats()
  const { partner, winRate, totalMatches: partnerMatches, wins: partnerWins, isLoading: partnerLoading } = useBestPartner(id)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: matchesLoading,
  } = usePlayerMatches(id)

  const allMatches = useMemo(() => {
    return data?.pages.flatMap(p => p.matches) ?? []
  }, [data])

  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const updatePlayer = useUpdatePlayer()
  const uploadAvatar = useAvatarUpload()
  const removeAvatar = useAvatarDelete()
  const setDefaultAvatar = useSetDefaultAvatar()

  const observerRef = useRef<IntersectionObserver | null>(null)

  const playerStats = stats.find(s => s.playerId === id)

  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isFetchingNextPage || !hasNextPage) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchNextPage()
      }
    })
    if (node) observerRef.current.observe(node)
  }, [isFetchingNextPage, hasNextPage, fetchNextPage])

  const handleStartEditName = useCallback(() => {
    if (player) {
      setEditName(player.name)
      setIsEditingName(true)
    }
  }, [player])

  const handleSaveName = useCallback(() => {
    if (player && editName.trim() && editName.trim() !== player.name) {
      updatePlayer.mutate({ id: player.id, name: editName.trim() })
    }
    setIsEditingName(false)
  }, [player, editName, updatePlayer])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName()
    if (e.key === 'Escape') setIsEditingName(false)
  }, [handleSaveName])

  if (playerLoading) {
    return (
      <div className="min-h-svh bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (playerError || !player) {
    return (
      <div className="min-h-svh bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
        Player not found
      </div>
    )
  }

  const donated = (playerStats?.losses ?? 0) * LOSS_PENALTY_VND

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-6 space-y-6 pb-8">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-3">
          <button onClick={() => setShowAvatarPicker(true)} className="relative">
            <Avatar
              src={player.avatar_url}
              name={player.name}
              size={80}
              bgColor="#dcfce7"
              textColor="#15803d"
            />
            <div className="absolute inset-0 rounded-full bg-black/10 opacity-0 active:opacity-100 transition-opacity" />
          </button>

          {isEditingName ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={handleKeyDown}
              autoFocus
              className="text-lg font-bold text-gray-900 text-center bg-white border border-gray-200 rounded-xl px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          ) : (
            <button
              onClick={handleStartEditName}
              className="flex items-center gap-1.5 text-lg font-bold text-gray-900 active:opacity-60 transition-opacity"
            >
              {player.name}
              <Pencil className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard icon={<Users className="w-4 h-4" />} label="Matches" value={playerStats?.matchesPlayed ?? 0} />
          <StatCard icon={<TrendingUp className="w-4 h-4 text-green-600" />} label="Wins" value={playerStats?.wins ?? 0} color="text-green-600" />
          <StatCard icon={<TrendingDown className="w-4 h-4 text-red-500" />} label="Losses" value={playerStats?.losses ?? 0} color="text-red-500" />
          <StatCard icon={<Trophy className="w-4 h-4 text-amber-500" />} label="Donated" value={formatCurrency(donated)} isCurrency />
        </div>

        {/* Best Partner */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Medal className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Best Partner</h3>
          </div>
          {partnerLoading ? (
            <div className="text-xs text-gray-400">Loading...</div>
          ) : partner ? (
            <div className="flex items-center gap-3">
              <Avatar src={partner.avatar_url} name={partner.name} size={44} bgColor="#dcfce7" textColor="#15803d" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{formatShortPlayerName(partner.name)}</p>
                <p className="text-xs text-gray-500">
                  {partnerWins}W / {partnerMatches - partnerWins}L · {Math.round(winRate * 100)}% win rate
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No doubles matches yet.</p>
          )}
        </div>

        {/* Match History — hidden due to layout error */}
        {false && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Match History</h3>
            <div className="space-y-2">
              {matchesLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading matches...</div>
              ) : allMatches.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No matches yet.</div>
              ) : (
                allMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    matchNumber={0}
                    isSwiped={false}
                    onSwipeOpen={() => {}}
                    onSwipeClose={() => {}}
                    onDelete={() => {}}
                    dateLabel={formatMatchDate(match.played_at)}
                    readonly
                    hideAvatars
                  />
                ))
              )}
              {hasNextPage && (
                <div ref={loadMoreRef} className="py-4 flex justify-center">
                  <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Avatar Picker */}
      {showAvatarPicker && (
        <AvatarPicker
          currentAvatarUrl={player.avatar_url}
          onSelect={(file) => uploadAvatar.mutate({ file, entity: 'players', id: player.id })}
          onSelectDefault={(url) =>
            setDefaultAvatar.mutate({ url, entity: 'players', id: player.id, oldAvatarUrl: player.avatar_url })
          }
          onRemove={() => removeAvatar.mutate({ entity: 'players', id: player.id, oldAvatarUrl: player.avatar_url })}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  )
}

function formatMatchDate(playedAt: string): string {
  const d = new Date(playedAt)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function StatCard({ icon, label, value, color, isCurrency }: {
  icon: React.ReactNode
  label: string
  value: number | string
  color?: string
  isCurrency?: boolean
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col items-center gap-1">
      <div className={`text-gray-400 ${color ?? ''}`}>{icon}</div>
      <p className={`text-sm font-bold ${color ?? 'text-gray-900'} ${isCurrency ? 'text-[11px]' : ''}`}>{value}</p>
      <p className="text-[10px] text-gray-400 font-medium">{label}</p>
    </div>
  )
}
