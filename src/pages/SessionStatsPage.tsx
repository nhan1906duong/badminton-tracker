import { useMemo, useCallback, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Activity, ChevronLeft, Medal, Crown } from 'lucide-react'
import { AppBar, Avatar, EmptyState, LoadingState, StatRow, PullToRefresh } from '../../design-system/components'
import { useMatches } from '../hooks/useMatches'
import { useSession } from '../hooks/useSessions'
import { useSessionWeeklyRankings, type SessionWeeklyStats } from '../hooks/useRankings'
import { useI18n } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { FireworkEffect } from '../components/firework-effect'

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}

function SessionRank({ rank }: { rank: number }) {
  const { t } = useI18n()
  const isFirst = rank === 1
  const color =
    isFirst ? 'var(--accent)'
    : rank === 2 ? 'color-mix(in oklch, var(--accent) 70%, var(--muted))'
    : rank === 3 ? 'color-mix(in oklch, var(--accent) 45%, var(--muted))'
    : 'var(--muted)'

  return (
    <div
      aria-label={t('common.rank', { rank })}
      style={{
        width: 36,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        fontWeight: 900,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        color,
      }}
    >
      {isFirst && (
        <Crown size={14} fill="var(--accent)" stroke="var(--accent)" />
      )}
      <span>{rank}</span>
    </div>
  )
}

interface PlayerStatsRowProps {
  stat: SessionWeeklyStats
  rank: number
  isLast: boolean
  onClick: () => void
}

function PlayerStatsRow({ stat, rank, isLast, onClick }: PlayerStatsRowProps) {
  const { t } = useI18n()
  const winRate = stat.matchesPlayed > 0 ? Math.round((stat.wins / stat.matchesPlayed) * 100) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="active:opacity-60"
      style={{
        width: '100%',
        minHeight: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) 0',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <SessionRank rank={rank} />
      <Avatar src={stat.avatarUrl} name={stat.name} size={36} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-base)',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: 0,
            color: 'var(--fg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {stat.name}
        </div>
        <div
          style={{
            marginTop: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--muted)',
          }}
        >
          {rank === 1 && (
            <>
              <span
                style={{
                  color: 'var(--accent)',
                  fontWeight: 800,
                }}
              >
                {t('sessionStats.championBadge')}
              </span>
              <span style={{ color: 'var(--border)' }}>·</span>
            </>
          )}
          <span>{t('units.match', { count: stat.matchesPlayed })}</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>{stat.wins}W</span>
          <span>{stat.losses}L</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>{winRate}%</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>{formatSigned(stat.pointDifference)} {t('sessionStats.diff')}</span>
        </div>
      </div>

      <div
        style={{
          minWidth: 64,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 900,
            lineHeight: 1,
            color: 'var(--fg)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 0,
          }}
        >
          {stat.weeklyPoints}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
          }}
        >
          {t('sessionStats.points')}
        </span>
      </div>
    </button>
  )
}

export default function SessionStatsPage() {
  const { t } = useI18n()
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: session } = useSession(sessionId)
  const { data: matches, isLoading: matchesLoading, refetch: refetchMatches } = useMatches(sessionId)
  const { data: rankings = [], isLoading: rankingsLoading, refetch: refetchRankings } = useSessionWeeklyRankings(sessionId)
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)

  const completedMatches = useMemo(
    () => matches?.filter((m) => m.status === 'COMPLETED') ?? [],
    [matches]
  )
  const totalPoints = rankings.reduce((sum, s) => sum + s.weeklyPoints, 0)
  const averagePoints = rankings.length > 0 ? Math.round(totalPoints / rankings.length) : 0
  const isLoading = matchesLoading || rankingsLoading

  // Champion detection: rank #1 in an ended session, matching current user's linked player
  const isChampion = useMemo(() => {
    if (!session?.ended_at || rankings.length === 0) return false
    if (!profile?.player_id) return false
    return rankings[0]?.playerId === profile.player_id
  }, [session?.ended_at, rankings, profile?.player_id])

  // Show firework once per session+player via localStorage
  const storageKey = sessionId && profile?.player_id
    ? `champion-firework:${sessionId}:${profile.player_id}`
    : ''

  const [dismissedFireworkKey, setDismissedFireworkKey] = useState<string | null>(null)

  const hasShownFirework = useMemo(() => {
    if (!storageKey || dismissedFireworkKey === storageKey) return true
    try {
      return localStorage.getItem(storageKey) === '1'
    } catch {
      return true
    }
  }, [dismissedFireworkKey, storageKey])

  const shouldShowFirework = isChampion && !hasShownFirework

  useEffect(() => {
    if (!shouldShowFirework) return
    const timer = setTimeout(() => {
      try {
        if (storageKey) localStorage.setItem(storageKey, '1')
      } catch {
        // ignore
      }
      setDismissedFireworkKey(storageKey)
    }, 4000)
    return () => clearTimeout(timer)
  }, [shouldShowFirework, storageKey])

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchMatches(), refetchRankings()])
  }, [refetchMatches, refetchRankings])

  if (!sessionId) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] px-[var(--space-5)] py-[var(--space-5)]">
        <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>{t('sessionDetail.notFound')}</p>
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
      {shouldShowFirework && <FireworkEffect />}

      <AppBar
        title=""
        leftAction={{
          icon: <ChevronLeft className="w-5 h-5 -ml-1" />,
          onClick: () => navigate(`/sessions/${sessionId}`),
        }}
      />

      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom) + 32px))' }}
      >
        <header style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)' }}>
          <div
            className="inline-flex items-center gap-[var(--space-2)]"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent)',
              marginBottom: 'var(--space-3)',
            }}
          >
            <Activity size={14} aria-hidden="true" />
            {t('sessionStats.eyebrow')}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: 0,
              color: 'var(--fg)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {t('sessionStats.title')}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              color: 'var(--muted)',
            }}
          >
            {session?.label ?? t('common.session')} · {t('units.completedMatches', { count: completedMatches.length })}
          </p>
          {isChampion && (
            <div
              className="inline-flex items-center gap-[var(--space-2)] mt-[var(--space-3)]"
              style={{
                padding: 'var(--space-2) var(--space-3)',
                background: 'color-mix(in oklch, var(--accent) 12%, transparent)',
                border: '1px solid color-mix(in oklch, var(--accent) 30%, transparent)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <Crown size={16} fill="var(--accent)" stroke="var(--accent)" />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 800,
                  color: 'var(--accent)',
                }}
              >
                {t('sessionStats.champion')}
              </span>
            </div>
          )}
          {session && !session.ended_at && (
            <div
              className="inline-flex items-center gap-[var(--space-2)] mt-[var(--space-2)]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--accent)',
              }}
            >
              <span
                className="rounded-full animate-pulse flex-shrink-0"
                style={{ width: 7, height: 7, background: 'var(--accent)' }}
              />
              {t('common.liveInProgress')}
            </div>
          )}
        </header>

        <main className="px-[var(--space-5)]">
          {isLoading ? (
            <LoadingState message={t('sessionStats.loading')} />
          ) : rankings.length === 0 ? (
            <EmptyState
              icon={<Medal className="w-10 h-10 mx-auto" />}
              title={t('sessionStats.emptyTitle')}
              description={t('sessionStats.emptyDescription')}
            />
          ) : (
            <>
              <section
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0 var(--space-4)',
                  marginBottom: 'var(--space-6)',
                }}
              >
                <StatRow label={t('sessionStats.completedMatches')} value={completedMatches.length} />
                <StatRow label={t('sessionStats.rankedPlayers')} value={rankings.length} />
                <StatRow label={t('sessionStats.averagePoints')} value={averagePoints} />
              </section>

              <section>
                <div className="flex items-baseline justify-between gap-[var(--space-3)] mb-[var(--space-3)]">
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-xl)',
                      fontWeight: 900,
                      lineHeight: 1.1,
                      letterSpacing: 0,
                      color: 'var(--fg)',
                    }}
                  >
                    {t('sessionStats.ranking')}
                  </h2>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--muted)',
                    }}
                  >
                    {t('sessionStats.weeklyPoints')}
                  </span>
                </div>

                <div>
                  {rankings.map((stat, index) => (
                    <PlayerStatsRow
                      key={stat.playerId}
                      stat={stat}
                      rank={index + 1}
                      isLast={index === rankings.length - 1}
                      onClick={() => navigate(`/players/${stat.playerId}`)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
    </PullToRefresh>
  )
}
