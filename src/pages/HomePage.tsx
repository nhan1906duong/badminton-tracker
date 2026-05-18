import { useNavigate } from 'react-router-dom'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { useOpenSession } from '../hooks/useSessions'
import { usePlayers } from '../hooks/usePlayers'
import { Trophy, Crown, Medal, ChevronRight, Flame, TrendingUp } from 'lucide-react'

const RANK_ICONS: Record<number, React.ReactNode> = {
  1: <Crown className="w-5 h-5 text-yellow-500" />,
  2: <Medal className="w-5 h-5 text-gray-400" />,
  3: <Medal className="w-5 h-5 text-amber-700" />,
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
        {RANK_ICONS[rank]}
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-gray-400">{rank}</span>
    </div>
  )
}

function formatCurrency(vnd: number): string {
  return new Intl.NumberFormat('vi-VN').format(vnd) + ' VND'
}

export default function HomePage() {
  const navigate = useNavigate()
  const { sortedByMatches, totalLost, isLoading } = usePlayerStats()
  const { data: activeSession } = useOpenSession()
  const { data: players } = usePlayers()

  const top5 = sortedByMatches.slice(0, 5)
  const totalPenalty = totalLost * 5000

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

        {/* Leaderboard */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold text-gray-900">Top Players</span>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading stats...</div>
          ) : top5.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-400">No matches yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {top5.map((player, index) => (
                <div
                  key={player.playerId}
                  onClick={() => navigate('/players')}
                  className={`flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 ${
                    index < top5.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <RankBadge rank={index + 1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-gray-900 truncate">
                      {player.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {player.matchesPlayed} matches
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      {player.wins}
                      <span className="text-gray-300 font-medium"> / {player.matchesPlayed}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">Wins</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
