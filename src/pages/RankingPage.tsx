import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Medal, UserPlus } from 'lucide-react'
import { usePlayerRankings } from '../hooks/useRankings'
import Avatar from '../components/Avatar'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { PullToRefresh } from '../../design-system/components'
import FloatingActionButton from '../components/FloatingActionButton'
import PlayerForm from '../components/PlayerForm'
import { useI18n } from '../i18n'

// Ghost rank number — pos 1/2/3 get faded accent, rest get faded border
function GhostRank({ rank }: { rank: number }) {
  const { t } = useI18n()
  const color =
    rank === 1 ? 'color-mix(in oklch, var(--accent) 35%, transparent)'
    : rank === 2 ? 'color-mix(in oklch, var(--accent) 20%, transparent)'
    : rank === 3 ? 'color-mix(in oklch, var(--accent) 10%, transparent)'
    : 'color-mix(in oklch, var(--border) 80%, transparent)'
  return (
    <div
      aria-label={t('common.rank', { rank })}
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
  const { t } = useI18n()
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
        {t('ranking.new')}
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
  const { t } = useI18n()
  const { user } = useAuth()
  const { data: myProfile } = useProfile(user?.id)
  const myPlayerId = myProfile?.player_id
  const { data: rankings = [], isLoading, refetch } = usePlayerRankings()
  const isAdmin = useIsAdmin()
  const [showAddPlayer, setShowAddPlayer] = useState(false)

  const playerCount = rankings.length
  const totalMatches = (rankings.reduce((s, r) => s + r.matchesPlayed, 0) / 2) | 0

  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  return (
    <>
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-svh pb-24" style={{ background: 'var(--bg)' }}>

      {/* Page Header */}
      <div
        className="px-[var(--space-5)] pb-[var(--space-4)]"
        style={{ paddingTop: 'max(var(--space-7), calc(env(safe-area-inset-top) + var(--space-5)))' }}
      >
        <h1
          className="text-[48px] font-extrabold leading-[1.05] tracking-[-0.03em] mb-[var(--space-2)]"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--fg)',
          }}
        >
          {t('ranking.title')}
        </h1>
        {!isLoading && rankings.length > 0 && (
          <p className="text-[13px]" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {t('units.player', { count: playerCount })} · {t('units.match', { count: totalMatches })}
          </p>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
          {t('common.loadingEllipsis')}
        </div>
      ) : rankings.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
          <Medal style={{ width: 40, height: 40, color: 'var(--muted)' }} />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{t('ranking.noData')}</p>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      className="text-[18px] font-extrabold leading-[1.15] tracking-[-0.01em]"
                      style={{
                        fontFamily: 'var(--font-display)',
                        color: 'var(--fg)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      {s.name}
                    </div>
                    {myPlayerId === s.playerId && (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: 'var(--accent)',
                          background: 'var(--accent-soft)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '2px 6px',
                          flexShrink: 0,
                        }}
                      >
                        {t('common.you')}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px]" style={{ color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
                    <span>{t('units.match', { count: s.matchesPlayed })}</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span>{s.wins} {t('ranking.wins')}</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span>{winRate}% {t('ranking.rate')}</span>
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
    </PullToRefresh>

    {isAdmin && (
      <FloatingActionButton
        onClick={() => setShowAddPlayer(true)}
        icon={<UserPlus size={22} />}
        ariaLabel={t('playerForm.addPlayer')}
      />
    )}

    {showAddPlayer && <PlayerForm onClose={() => setShowAddPlayer(false)} />}
    </>
  )
}
