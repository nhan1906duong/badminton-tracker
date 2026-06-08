import { useMemo, useCallback, useState } from 'react'
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
import type { MatchWithDetails, Session } from '../types/database'
import { useI18n } from '../i18n'
import { useSessionLeaderboards } from '../hooks/useRankings'
import { useAuth } from '../hooks/useAuth'

interface SessionStat {
  matchCount: number
  topPlayer?: {
    name: string
    avatarUrl?: string | null
    record: string
    winRate: number
  }
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
  const {
    data: sessionLeaderboards,
    isLoading: leaderboardsLoading,
    isError: leaderboardsError,
    refetch: refetchLeaderboards,
  } = useSessionLeaderboards()

  const sessionStats = useMemo(() => {
    if (!allMatches) return new Map<string, SessionStat>()

    const stats = new Map<string, SessionStat>()
    const matchesBySession = new Map<string, MatchWithDetails[]>()

    for (const match of allMatches) {
      const list = matchesBySession.get(match.session_id) ?? []
      list.push(match)
      matchesBySession.set(match.session_id, list)
    }

    for (const [sessionId, matches] of matchesBySession) {
      const leader = sessionLeaderboards?.get(sessionId)?.leader

      const topPlayer =
        leader && leader.matchesPlayed > 0
          ? {
              name: leader.name,
              avatarUrl: leader.avatarUrl,
              record: t('units.winLossPlayed', { wins: leader.wins, losses: leader.losses, played: leader.matchesPlayed }),
              winRate: Math.round((leader.wins / leader.matchesPlayed) * 100),
            }
          : undefined

      stats.set(sessionId, { matchCount: matches.length, topPlayer })
    }

    return stats
  }, [allMatches, sessionLeaderboards, t])

  // Group sessions: Live → Upcoming → Recent. Within each group the
  // existing reverse-chronological order (from the query) is preserved.
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

  const isLoading = sessionsLoading || matchesLoading || leaderboardsLoading
  const isError = sessionsError || matchesError || leaderboardsError

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
    await Promise.all([refetchSessions(), refetchMatches(), refetchLeaderboards()])
  }, [refetchSessions, refetchMatches, refetchLeaderboards])

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
            sessionGroups.map((group) => (
              <div key={group.key} className="space-y-[var(--space-3)]">
                {showGroupHeaders && (
                  <SectionLabel className="px-[var(--space-1)] pt-[var(--space-2)]">
                    {group.label}
                  </SectionLabel>
                )}
                {group.items.map((session) => {
                  const stat = sessionStats.get(session.id)
                  return (
                    <button
                      key={session.id}
                      onClick={() => navigate(`/sessions/${session.id}`, { state: { from: '/sessions' } })}
                      className="w-full text-left active:scale-[0.98] transition-transform"
                      style={{ borderRadius: 'var(--radius-lg)' }}
                    >
                      <SessionCard
                        status={getSessionStatus(session)}
                        name={getSessionName(session, locale)}
                        dateTime={formatSessionDateTime(session.started_at, locale)}
                        duration={formatSessionDuration(session.started_at, session.ended_at, locale)}
                        matchCount={stat?.matchCount ?? 0}
                        topPlayer={stat?.topPlayer}
                        compact
                        tournamentCategory={session.bwf_tournaments ? {
                          categoryName: session.bwf_tournaments.category_name,
                          categorySlug: session.bwf_tournaments.category_slug,
                        } : null}
                      />
                    </button>
                  )
                })}
              </div>
            ))
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
