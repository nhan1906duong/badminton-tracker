import { useMemo, useCallback, useState, useRef, useLayoutEffect } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { useMatches } from '../hooks/useMatches'
import { SessionCard, EmptyState, ErrorState, PullToRefresh, Tabs, SectionLabel } from '../../design-system/components'
import { ShuttleLoading } from '../components/ShuttleLoading'
import { CalendarTab } from '../components/CalendarTab'
import { Plus, Trophy } from 'lucide-react'
import FloatingActionButton from '../components/FloatingActionButton'
import LoginAffordance from '../components/LoginAffordance'
import {
  formatSessionDuration,
  formatSessionDateTime,
  getSessionName,
  getSessionStatus,
} from '../lib/session-format'
import type { Session } from '../types/database'
import { useI18n } from '../i18n'
import type { Locale, TFunction } from '../i18n'
import { useSessionLeaderboard } from '../hooks/useRankings'
import { useAuth } from '../hooks/useAuth'

/**
 * Per-session leaderboard card — fetches only when the session is in the list.
 * This replaces useSessionLeaderboards() which fetched all result rows for all sessions.
 */
function SessionLeaderboardCard({
  session,
  matchCount,
  onNavigate,
  locale,
  t,
}: {
  session: Session
  matchCount: number
  onNavigate: () => void
  locale: Locale
  t: TFunction
}) {
  const { data: leaderboard } = useSessionLeaderboard(session.id)
  const leader = leaderboard?.leader

  const topPlayer =
    leader && leader.matchesPlayed > 0
      ? {
          name: leader.name,
          avatarUrl: leader.avatarUrl,
          record: t('units.winLossPlayed', { wins: leader.wins, losses: leader.losses, played: leader.matchesPlayed }),
          winRate: Math.round((leader.wins / leader.matchesPlayed) * 100),
        }
      : undefined

  return (
    <button
      onClick={onNavigate}
      className="w-full text-left active:scale-[0.98] transition-transform"
      style={{ borderRadius: 'var(--radius-lg)' }}
    >
      <SessionCard
        status={getSessionStatus(session)}
        name={getSessionName(session, locale)}
        dateTime={formatSessionDateTime(session.started_at, locale)}
        duration={formatSessionDuration(session.started_at, session.ended_at, locale)}
        matchCount={matchCount}
        topPlayer={topPlayer}
        compact
        tournamentCategory={session.bwf_tournaments ? {
          categoryName: session.bwf_tournaments.category_name,
          categorySlug: session.bwf_tournaments.category_slug,
        } : null}
      />
    </button>
  )
}

export default function SessionsListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { locale, t } = useI18n()
  const [activeTabKey, setActiveTabKey] = useState<'list' | 'calendar'>('list')
  const {
    data: sessions,
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useSessions()
  const {
    data: allMatches,
    isLoading: matchesLoading,
    isError: matchesError,
    refetch: refetchMatches,
  } = useMatches()

  // matchCountBySession built from session-scoped match data (already cached per session)
  const matchCountBySession = useMemo(() => {
    const map = new Map<string, number>()
    for (const match of allMatches ?? []) {
      map.set(match.session_id, (map.get(match.session_id) ?? 0) + 1)
    }
    return map
  }, [allMatches])

  // Group sessions: Live → Upcoming → Recent.
  const sessionGroups = useMemo(() => {
    const live: Session[] = []
    const scheduled: Session[] = []
    const completed: Session[] = []
    for (const session of sessions ?? []) {
      const status = getSessionStatus(session)
      if (status === 'active') live.push(session)
      else if (status === 'scheduled') scheduled.push(session)
      else completed.push(session)
    }
    return [
      { key: 'live', label: t('sessions.groupLive'), items: live },
      { key: 'scheduled', label: t('sessions.groupUpcoming'), items: scheduled },
      { key: 'completed', label: t('sessions.groupRecent'), items: completed },
    ].filter((g) => g.items.length > 0)
  }, [sessions, t])

  const showGroupHeaders = sessionGroups.length > 1
  const isLoading = sessionsLoading || matchesLoading
  const isError = sessionsError || matchesError

  type FlatRow =
    | { type: 'header'; key: string; label: string }
    | { type: 'session'; key: string; session: Session }

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = []
    for (const group of sessionGroups) {
      if (showGroupHeaders) rows.push({ type: 'header', key: `header-${group.key}`, label: group.label })
      for (const session of group.items) {
        rows.push({ type: 'session', key: session.id, session })
      }
    }
    return rows
  }, [sessionGroups, showGroupHeaders])

  const listRef = useRef<HTMLDivElement>(null)
  const [listScrollMargin, setListScrollMargin] = useState(0)

  useLayoutEffect(() => {
    if (activeTabKey === 'list' && !isLoading && listRef.current)
      setListScrollMargin(listRef.current.offsetTop)
  }, [activeTabKey, isLoading])

  const listVirtualizer = useWindowVirtualizer({
    count: activeTabKey === 'list' ? flatRows.length : 0,
    estimateSize: (index) => (flatRows[index]?.type === 'header' ? 40 : 100),
    overscan: 5,
    scrollMargin: listScrollMargin,
  })

  const activeCount = sessions?.filter((s) => getSessionStatus(s) === 'active').length ?? 0
  const scheduledCount = sessions?.filter((s) => getSessionStatus(s) === 'scheduled').length ?? 0
  const subtitle = sessions
    ? [
        t('units.session', { count: sessions.length }),
        activeCount > 0 ? t('units.active', { count: activeCount }) : null,
        scheduledCount > 0 ? t('units.scheduled', { count: scheduledCount }) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchSessions(), refetchMatches()])
  }, [refetchSessions, refetchMatches])

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-svh bg-[var(--bg)]">
      {/* Page Header */}
      <div
        className="px-[var(--space-5)] pb-[var(--space-4)]"
        style={{ paddingTop: 'var(--space-6)' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <h1
            className="text-[48px] font-extrabold leading-[1.05] tracking-[-0.03em]"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
          >
            {t('sessions.title')}
          </h1>
          {!user && <LoginAffordance />}
        </div>
        {subtitle && (
          <p className="text-[13px]" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Tab switcher */}
      <div className="px-[var(--space-5)]">
        <Tabs
          tabs={[t('sessions.tabList'), t('sessions.tabCalendar')]}
          activeTab={activeTabKey === 'list' ? t('sessions.tabList') : t('sessions.tabCalendar')}
          onTabChange={(tab) => setActiveTabKey(tab === t('sessions.tabList') ? 'list' : 'calendar')}
        />
      </div>

      {/* List */}
      {activeTabKey === 'list' && (
        <div className="px-[var(--space-5)] space-y-[var(--space-3)] pt-[var(--space-4)] pb-32">
          {isLoading ? (
            <ShuttleLoading compact />
          ) : isError ? (
            <ErrorState
              message={t('sessions.loadError')}
              onRetry={() => {
                refetchSessions()
                refetchMatches()
              }}
            />
          ) : sessionGroups.length > 0 ? (
            <div ref={listRef} style={{ position: 'relative', height: listVirtualizer.getTotalSize() }}>
              {listVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = flatRows[virtualRow.index]
                const isLast = virtualRow.index === flatRows.length - 1
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={listVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start - listVirtualizer.options.scrollMargin}px)`,
                      paddingBottom: isLast ? 0 : 12,
                    }}
                  >
                    {row.type === 'header' ? (
                      <SectionLabel className="px-[var(--space-1)] pt-[var(--space-2)]">
                        {row.label}
                      </SectionLabel>
                    ) : (
                      <SessionLeaderboardCard
                        session={row.session}
                        matchCount={matchCountBySession.get(row.session.id) ?? 0}
                        onNavigate={() => navigate(`/sessions/${row.session.id}`, { state: { from: '/sessions' } })}
                        locale={locale}
                        t={t}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Trophy className="w-9 h-9 mx-auto" />}
              title={t('sessions.noneYet')}
              description={t('sessions.emptyDescription')}
            />
          )}
        </div>
      )}

      {/* Calendar */}
      {activeTabKey === 'calendar' && (
        isLoading ? (
          <div className="px-[var(--space-5)] pt-[var(--space-4)]">
            <ShuttleLoading compact />
          </div>
        ) : (
          <div className="pt-[var(--space-4)]">
            <CalendarTab />
          </div>
        )
      )}

      {user && (
        <FloatingActionButton
          onClick={() => navigate('/sessions/new')}
          icon={<Plus className="w-6 h-6" />}
          ariaLabel={t('sessions.createNew')}
        />
      )}
    </div>
    </PullToRefresh>
  )
}
