import { useNavigate } from 'react-router-dom'
import { Medal } from 'lucide-react'
import { usePlayerRankings } from '../hooks/useRankings'
import Avatar from '../components/Avatar'
import { formatShortPlayerName } from '../lib/player-name'

// Ghost rank number — pos 1/2/3 get faded accent, rest get faded border
function GhostRank({ rank }: { rank: number }) {
  const color =
    rank === 1 ? 'color-mix(in oklch, var(--accent) 35%, transparent)'
    : rank === 2 ? 'color-mix(in oklch, var(--accent) 20%, transparent)'
    : rank === 3 ? 'color-mix(in oklch, var(--accent) 10%, transparent)'
    : 'color-mix(in oklch, var(--border) 80%, transparent)'
  return (
    <div
      aria-label={`Rank ${rank}`}
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 24,
        fontWeight: 900,
        lineHeight: 1,
        width: 44,
        textAlign: 'center',
        flexShrink: 0,
        letterSpacing: '-0.04em',
        color,
        userSelect: 'none',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {rank}
    </div>
  )
}

// SVG trend arrows matching design/pages/ranking-page.html .rank-trend
function RankTrend({ change, isNew }: { change: number; isNew?: boolean }) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    minWidth: 32,
    justifyContent: 'flex-end',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  }
  const svgStyle: React.CSSProperties = {
    stroke: 'currentColor',
    strokeWidth: 2.2,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    display: 'block',
  }

  if (isNew) {
    return (
      <div style={{ ...baseStyle, color: 'var(--accent)', letterSpacing: '0.05em' }}>
        NEW
      </div>
    )
  }
  if (change > 0) {
    return (
      <div style={{ ...baseStyle, color: 'var(--success)' }}>
        <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden="true" style={svgStyle}>
          <path d="M6 2 L6 10 M2.5 5.5 L6 2 L9.5 5.5" />
        </svg>
        <span>{change}</span>
      </div>
    )
  }
  if (change < 0) {
    return (
      <div style={{ ...baseStyle, color: 'var(--danger)' }}>
        <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden="true" style={svgStyle}>
          <path d="M6 10 L6 2 M2.5 6.5 L6 10 L9.5 6.5" />
        </svg>
        <span>{Math.abs(change)}</span>
      </div>
    )
  }
  return (
    <div style={{ ...baseStyle, color: 'var(--muted)', minWidth: 32, justifyContent: 'flex-end' }}>
      <span style={{ display: 'block', width: 8, height: 2, background: 'currentColor', borderRadius: 1 }} aria-hidden="true" />
    </div>
  )
}

export default function RankingPage() {
  const navigate = useNavigate()
  const { data: rankings = [], isLoading } = usePlayerRankings()

  const playerCount = rankings.length
  const totalMatches = (rankings.reduce((s, r) => s + r.matchesPlayed, 0) / 2) | 0

  return (
    <div className="min-h-svh pb-24" style={{ background: 'var(--bg)' }}>

      {/* Page Header */}
      <div
        className="px-[var(--space-5)] pb-[var(--space-4)]"
        style={{ paddingTop: 'max(var(--space-7), env(safe-area-inset-top) + var(--space-5))' }}
      >
        <h1
          className="text-[48px] font-extrabold leading-[1.05] tracking-[-0.03em] mb-[var(--space-2)]"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--fg)',
          }}
        >
          Rankings
        </h1>
        {!isLoading && rankings.length > 0 && (
          <p className="text-[13px]" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {playerCount} players · {totalMatches} matches
          </p>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
          Loading...
        </div>
      ) : rankings.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
          <Medal style={{ width: 40, height: 40, color: 'var(--muted)' }} />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>No match data yet.</p>
        </div>
      ) : (
        <div style={{ margin: '0 var(--space-5)' }}>
          {rankings.map((s, i) => {
            const winRate = Math.round(s.winRate * 100)
            const isLast = i === rankings.length - 1
            const isNew = s.matchesPlayed === 0
            return (
              <button
                key={s.playerId}
                onClick={() => navigate(`/players/${s.playerId}`)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) 0',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
                className="active:opacity-60"
              >
                <GhostRank rank={s.rank} />

                <Avatar src={s.avatarUrl} name={s.name} size={32} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="text-[18px] font-extrabold leading-[1.15] tracking-[-0.01em]"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: 'var(--fg)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatShortPlayerName(s.name)}
                  </div>
                  <div className="font-mono text-[11px]" style={{ color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
                    <span><span style={{ color: 'var(--fg)', fontWeight: 600 }}>{s.matchesPlayed}</span> matches</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span><span style={{ color: 'var(--fg)', fontWeight: 600 }}>{s.wins}</span> W</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span><span style={{ color: 'var(--fg)', fontWeight: 600 }}>{winRate}%</span> rate</span>
                  </div>
                </div>

                {/* Rating on top, trend indicator below */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, minWidth: 64 }}>
                  <div
                    className="text-[15px] font-extrabold leading-none"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: 'var(--accent)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.rating}
                  </div>
                  <RankTrend change={s.rankChange} isNew={isNew} />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
