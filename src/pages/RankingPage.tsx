import { useNavigate } from 'react-router-dom'
import { Medal } from 'lucide-react'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { usePlayers } from '../hooks/usePlayers'
import Avatar from '../components/Avatar'
import { formatShortPlayerName } from '../lib/player-name'

export default function RankingPage() {
  const navigate = useNavigate()
  const { stats, isLoading } = usePlayerStats()
  const { data: players } = usePlayers()

  const playerMap = new Map(players?.map((p) => [p.id, p]) ?? [])

  const ranked = [...stats]
    .filter((s) => s.matchesPlayed > 0)
    .sort((a, b) => {
      const aRate = a.wins / a.matchesPlayed
      const bRate = b.wins / b.matchesPlayed
      return bRate - aRate || b.matchesPlayed - a.matchesPlayed
    })

  return (
    <div className="min-h-svh bg-[var(--bg)] pb-24">
      <div className="px-[var(--space-5)] pt-[var(--space-5)] pb-[var(--space-4)]">
        <h1
          className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em]"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
        >
          Ranking
        </h1>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[13px]" style={{ color: 'var(--muted)' }}>
          Loading...
        </div>
      ) : ranked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Medal className="w-10 h-10" style={{ color: 'var(--muted)' }} />
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
            No match data yet.
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden border border-[var(--border)] rounded-[var(--radius-lg)]"
          style={{ margin: '0 var(--space-5)' }}
        >
          {ranked.map((s, i) => {
            const player = playerMap.get(s.playerId)
            const winRate = Math.round((s.wins / s.matchesPlayed) * 100)
            const isTop = i < 2
            return (
              <button
                key={s.playerId}
                onClick={() => navigate(`/players/${s.playerId}`)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 active:bg-[var(--bg)]"
                style={{
                  background: 'var(--surface)',
                  borderBottom: i < ranked.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div
                  className="w-8 text-center text-[24px] font-extrabold shrink-0 leading-none"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: isTop ? 'var(--accent)' : 'var(--muted)',
                  }}
                >
                  {i + 1}
                </div>

                <Avatar src={player?.avatar_url} name={s.name} size={40} />

                <div className="flex-1 min-w-0">
                  <div
                    className="text-[15px] font-semibold truncate"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
                  >
                    {formatShortPlayerName(s.name)}
                  </div>
                  <div
                    className="text-[13px]"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                  >
                    {s.matchesPlayed}M · {s.wins}W {s.losses}L
                  </div>
                </div>

                <div
                  className="text-[15px] font-extrabold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}
                >
                  {winRate}%
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
