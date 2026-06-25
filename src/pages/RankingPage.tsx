import { useCallback, useState, useMemo, useRef, useLayoutEffect } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useNavigate } from 'react-router-dom'
import { Medal, UserPlus, Crown } from 'lucide-react'
import { useCompletedMatchCount, useSessionLeaderboard, type SessionWeeklyStats } from '../hooks/useRankings'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useMenDoublesRankings } from '../hooks/useMenDoublesRankings'
import { useSessions } from '../hooks/useSessions'
import Avatar from '../components/Avatar'
import PlayerRecordLine from '../components/PlayerRecordLine'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { PullToRefresh, BwfCategoryBadge, Tabs } from '../../design-system/components'
import FloatingActionButton from '../components/FloatingActionButton'
import LoginAffordance from '../components/LoginAffordance'
import PlayerForm from '../components/PlayerForm'
import { LOCALE_TAG, useI18n } from '../i18n'
import { formatShortPlayerName } from '../lib/player-name'
import { ShuttleLoading } from '../components/ShuttleLoading'

function GhostRank({ rank, showCrown }: { rank: number; showCrown?: boolean }) {
  const { t } = useI18n()
  const color =
    rank === 1 ? 'var(--accent)'
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
      {showCrown && rank === 1 && <Crown size={14} fill="var(--accent)" stroke="var(--accent)" />}
      <span>{rank}</span>
    </div>
  )
}

function RankTrend({ change, isNew }: { change: number; isNew?: boolean }) {
  const { t } = useI18n()
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
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
    <div style={{ ...baseStyle, color: 'var(--muted)' }}>
      <span style={{ display: 'block', width: 8, height: 2, background: 'currentColor', borderRadius: 1 }} aria-hidden="true" />
    </div>
  )
}

function TopOneWeekStreakText({ count }: { count: number }) {
  const { t } = useI18n()
  if (count <= 1) return null

  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--muted)',
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        minWidth: 0,
      }}
    >
      <span className="hidden min-[390px]:inline">{t('ranking.topOneWeekStreak', { count })}</span>
      <span className="inline min-[390px]:hidden">{t('ranking.topOneWeekStreakShort', { count })}</span>
    </div>
  )
}

function SessionPlayerRow({ stat, rank, isLast, onClick, isMe }: {
  stat: SessionWeeklyStats
  rank: number
  isLast: boolean
  onClick: () => void
  isMe?: boolean
}) {
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
      <GhostRank rank={rank} showCrown />
      <Avatar src={stat.avatarUrl} name={stat.name} size={32} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.4,
              color: 'var(--fg)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {stat.name}
          </span>
          {rank === 1 && (
            <span
              style={{
                flexShrink: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 800,
                lineHeight: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent)',
              }}
            >
              {t('sessionStats.championBadge')}
            </span>
          )}
          {isMe && (
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
        <PlayerRecordLine
          matchesPlayed={stat.matchesPlayed}
          wins={stat.wins}
          losses={stat.losses}
          winRate={winRate}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, minWidth: 64 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 900,
            lineHeight: 1,
            color: 'var(--fg)',
            fontVariantNumeric: 'tabular-nums',
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

export default function RankingPage() {
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const { data: myProfile } = useProfile(user?.id)
  const myPlayerId = myProfile?.player_id
  const { data: rankings = [], isLoading, refetch } = useLeaderboard()
  const { data: completedMatchCount = 0, refetch: refetchCompletedMatchCount } = useCompletedMatchCount()
  const { data: sessions = [] } = useSessions()
  const isAdmin = useIsAdmin()
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'session' | 'doubles'>('all')

  const latestSession = useMemo(
    () => sessions.find((s) => s.ended_at != null) ?? null,
    [sessions]
  )

  const { data: sessionLeaderboard, isLoading: sessionLoading, refetch: refetchSession } =
    useSessionLeaderboard(latestSession?.id)

  const { rankings: doublesRankings, isLoading: doublesLoading } = useMenDoublesRankings()

  const sessionRankings = sessionLeaderboard?.rankings ?? []

  const playerCount = rankings.length

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchSession(), refetchCompletedMatchCount()])
  }, [refetch, refetchCompletedMatchCount, refetchSession])

  const TAB_ALL = t('ranking.tabAll')
  const TAB_DOUBLES = t('ranking.tabDoubles')
  const TAB_SESSION = t('ranking.tabSession')

  const allListRef = useRef<HTMLDivElement>(null)
  const doublesListRef = useRef<HTMLDivElement>(null)
  const [allScrollMargin, setAllScrollMargin] = useState(0)
  const [doublesScrollMargin, setDoublesScrollMargin] = useState(0)

  useLayoutEffect(() => {
    if (activeTab === 'all' && allListRef.current)
      setAllScrollMargin(allListRef.current.offsetTop)
    if (activeTab === 'doubles' && doublesListRef.current)
      setDoublesScrollMargin(doublesListRef.current.offsetTop)
  }, [activeTab, isLoading, doublesLoading])

  const allVirtualizer = useWindowVirtualizer({
    count: activeTab === 'all' ? rankings.length : 0,
    estimateSize: () => 72,
    overscan: 5,
    scrollMargin: allScrollMargin,
  })

  const doublesVirtualizer = useWindowVirtualizer({
    count: activeTab === 'doubles' ? doublesRankings.length : 0,
    estimateSize: () => 72,
    overscan: 5,
    scrollMargin: doublesScrollMargin,
  })

  return (
    <>
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-svh pb-24" style={{ background: 'var(--bg)' }}>

      {/* Page Header */}
      <div
        className="px-[var(--space-5)] pb-[var(--space-4)]"
        style={{ paddingTop: 'var(--space-6)' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <h1
            className="text-[48px] font-extrabold leading-[1.05] tracking-[-0.03em]"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--fg)',
            }}
          >
            {t('ranking.title')}
          </h1>
          {!user && <LoginAffordance />}
        </div>
        {!isLoading && rankings.length > 0 && (
          <p className="text-[13px]" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {t('units.player', { count: playerCount })} · {t('units.match', { count: completedMatchCount })}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-[var(--space-4)] overflow-x-auto px-[var(--space-5)] [&::-webkit-scrollbar]:hidden">
        <Tabs
          tabs={[
            { key: 'all', label: TAB_ALL },
            { key: 'doubles', label: TAB_DOUBLES },
            { key: 'session', label: latestSession?.label ?? TAB_SESSION },
          ]}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as typeof activeTab)}
        />
      </div>

      {/* Content */}
      {activeTab === 'all' ? (
        isLoading ? (
          <ShuttleLoading compact />
        ) : rankings.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
            <Medal style={{ width: 40, height: 40, color: 'var(--muted)' }} />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{t('ranking.noData')}</p>
          </div>
        ) : (
          <div
            ref={allListRef}
            style={{ position: 'relative', height: allVirtualizer.getTotalSize(), margin: '0 var(--space-5)' }}
          >
            {allVirtualizer.getVirtualItems().map((virtualRow) => {
              const s = rankings[virtualRow.index]
              const winRate = s.matchesPlayed > 0 ? Math.round((s.wins / s.matchesPlayed) * 100) : 0
              const isLast = virtualRow.index === rankings.length - 1
              const isNew = s.matchesPlayed === 0
              return (
                <button
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={allVirtualizer.measureElement}
                  onClick={() => navigate(`/players/${s.playerId}`)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
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
                    transform: `translateY(${virtualRow.start - allVirtualizer.options.scrollMargin}px)`,
                  }}
                  className="active:opacity-60"
                >
                  <GhostRank rank={s.rank} />

                  <Avatar src={s.avatarUrl} name={s.name} size={32} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div
                        className="text-[18px] font-extrabold leading-[1.4] tracking-[-0.01em]"
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
                      <TopOneWeekStreakText count={s.topOneWeekStreak} />
                    </div>
                    <PlayerRecordLine
                      matchesPlayed={s.matchesPlayed}
                      wins={s.wins}
                      losses={s.losses}
                      winRate={winRate}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {(isNew || s.rankChange !== 0) && <RankTrend change={s.rankChange} isNew={isNew} />}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
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
                      {!isNew && s.lastSessionRatingDelta !== 0 && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: s.lastSessionRatingDelta > 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {s.lastSessionRatingDelta > 0 ? '+' : ''}{s.lastSessionRatingDelta}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )
      ) : activeTab === 'session' ? (
        /* Session tab */
        !latestSession ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
            <Medal style={{ width: 40, height: 40, color: 'var(--muted)' }} />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{t('ranking.noSession')}</p>
          </div>
        ) : sessionLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
            {t('common.loadingEllipsis')}
          </div>
        ) : sessionRankings.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
            <Medal style={{ width: 40, height: 40, color: 'var(--muted)' }} />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{t('sessionStats.emptyTitle')}</p>
          </div>
        ) : (
          <div style={{ margin: '0 var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
              {latestSession.bwf_tournaments && (
                <BwfCategoryBadge
                  categoryName={latestSession.bwf_tournaments.category_name}
                  categorySlug={latestSession.bwf_tournaments.category_slug}
                />
              )}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--muted)',
                }}
              >
                {new Date(latestSession.started_at).toLocaleDateString(LOCALE_TAG[locale], {
                  weekday: 'short', month: 'short', day: 'numeric',
                })}
                {' · '}
                {new Date(latestSession.started_at).toLocaleTimeString(LOCALE_TAG[locale], {
                  hour: 'numeric', minute: '2-digit',
                })}
              </span>
            </div>
            {sessionRankings.map((stat, i) => (
              <SessionPlayerRow
                key={stat.playerId}
                stat={stat}
                rank={i + 1}
                isLast={i === sessionRankings.length - 1}
                onClick={() => navigate(`/players/${stat.playerId}`)}
                isMe={myPlayerId === stat.playerId}
              />
            ))}
          </div>
        )
      ) : (
        /* Doubles tab */
        doublesLoading ? (
          <ShuttleLoading compact />
        ) : doublesRankings.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
            <Medal style={{ width: 40, height: 40, color: 'var(--muted)' }} />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{t('ranking.noDoubles')}</p>
          </div>
        ) : (
          <div style={{ margin: '0 var(--space-5)' }}>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.1em] px-1 mb-3"
              style={{ color: 'var(--muted)' }}
            >
              {t('ranking.pairCount', { count: doublesRankings.length })}
            </p>
            <div
              ref={doublesListRef}
              style={{ position: 'relative', height: doublesVirtualizer.getTotalSize() }}
            >
              {doublesVirtualizer.getVirtualItems().map((virtualRow) => {
                const pair = doublesRankings[virtualRow.index]
                const isLast = virtualRow.index === doublesRankings.length - 1
                const winRatePct = Math.round(pair.winRate * 100)
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={doublesVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3) 0',
                      borderBottom: isLast ? 'none' : '1px solid var(--border)',
                      transform: `translateY(${virtualRow.start - doublesVirtualizer.options.scrollMargin}px)`,
                    }}
                  >
                    <GhostRank rank={virtualRow.index + 1} />

                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      <Avatar src={pair.player1.avatar_url} name={pair.player1.name} size={20} />
                      <Avatar src={pair.player2.avatar_url} name={pair.player2.name} size={20} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 15,
                          fontWeight: 800,
                          color: 'var(--fg)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatShortPlayerName(pair.player1.name)} / {formatShortPlayerName(pair.player2.name)}
                      </div>
                      <PlayerRecordLine
                        matchesPlayed={pair.matchesPlayed}
                        wins={pair.wins}
                        losses={pair.losses}
                        winRate={winRatePct}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, minWidth: 48 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 'var(--text-xl)',
                          fontWeight: 900,
                          lineHeight: 1,
                          color: 'var(--fg)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {pair.totalPoints}
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
                        {t('ranking.pts')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
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
