import { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { useMatches } from '../hooks/useMatches'
import { SessionCard, EmptyState, ErrorState, PullToRefresh } from '../../design-system/components'
import { ShuttleLoading } from '../components/ShuttleLoading'
import { Plus, Trophy, User } from 'lucide-react'
import FloatingActionButton from '../components/FloatingActionButton'
import {
  formatSessionDuration,
  formatSessionDateTime,
  getSessionName,
  getSessionStatus,
} from '../lib/session-format'
import type { MatchWithDetails } from '../types/database'
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
          {!user && (
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'color-mix(in oklch, var(--muted) 35%, var(--bg))', color: 'var(--surface)', display: 'grid', placeItems: 'center', cursor: 'pointer', touchAction: 'manipulation', flexShrink: 0 }}
            >
              <User size={18} />
            </button>
          )}
        </div>
        {subtitle && (
          <p className="text-[13px]" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* List */}
      <div className="px-[var(--space-5)] space-y-[var(--space-3)] pb-32">
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
        ) : sessions && sessions.length > 0 ? (
          sessions.map((session) => {
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
          })
        ) : (
          <EmptyState
            icon={<Trophy className="w-9 h-9 mx-auto" />}
            title={t('sessions.noneYet')}
            description={t('sessions.emptyDescription')}
          />
        )}
      </div>

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
