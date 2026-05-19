import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { useOpenSession } from '../hooks/useSessions'
import { usePlayers } from '../hooks/usePlayers'
import { Trophy, ChevronRight, Flame, TrendingUp } from 'lucide-react'
import PodiumChart from '../components/PodiumChart'
import { formatCurrency, LOSS_PENALTY_VND } from '../lib/currency'

export default function HomePage() {
  const navigate = useNavigate()
  const { stats, totalLost, isLoading } = usePlayerStats()
  const { data: activeSession } = useOpenSession()
  const { data: players } = usePlayers()

  const top5 = useMemo(
    () => [...stats].sort((a, b) => b.losses - a.losses).slice(0, 5),
    [stats],
  )

  const avatarMap = useMemo(() => {
    const map = new Map<string, string | null>()
    players?.forEach((p) => map.set(p.id, p.avatar_url))
    return map
  }, [players])
  const totalPenalty = totalLost * LOSS_PENALTY_VND

  const activePlayerCount = players?.filter((p) => p.is_active).length ?? 0

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-5 pb-32">
        {/* Total Lost Card */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-1">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Total Lost</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(totalPenalty)}
          </p>
          <p className="text-xs text-gray-400">
            {totalLost} losses × 5,000 VND
          </p>
        </section>

        {/* Active Session */}
        {activeSession ? (
          <button
            onClick={() => navigate(`/sessions/${activeSession.id}`)}
            className="w-full text-left bg-green-600 rounded-2xl p-4 text-white active:scale-[0.98] transition-transform shadow-lg shadow-green-600/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5" />
                <span className="text-sm font-bold">Active Session</span>
              </div>
              <ChevronRight className="w-5 h-5" />
            </div>
            <p className="text-[15px] font-semibold mt-2 truncate">
              {activeSession.label ||
                new Date(activeSession.started_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
            </p>
            <p className="text-xs text-green-200 mt-0.5">
              {activePlayerCount} active players
            </p>
          </button>
        ) : (
          <button
            onClick={() => navigate('/sessions/new')}
            className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-gray-900">No Active Session</p>
                  <p className="text-xs text-gray-400">Tap to start one</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          </button>
        )}

        {/* Donation Leaderboard */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold text-gray-900">Top Donate Players</span>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading stats...</div>
          ) : top5.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-400">No matches yet.</p>
            </div>
          ) : (
            <div
              className="bg-white rounded-2xl border border-gray-100 p-4 active:bg-gray-50 transition-colors"
              onClick={() => navigate('/players')}
            >
              <PodiumChart
                players={top5.map((p, i) => ({
                  rank: i + 1,
                  name: p.name,
                  wins: p.wins,
                  matchesPlayed: p.matchesPlayed,
                  value: p.losses * 5,
                  valueLabel: 'k',
                  avatarUrl: avatarMap.get(p.playerId) ?? undefined,
                }))}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
