import { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { useMatches } from '../hooks/useMatches'
import { SessionCard, LoadingState, EmptyState, ErrorState, PullToRefresh } from '../../design-system/components'
import { Plus, Trophy } from 'lucide-react'
import FloatingActionButton from '../components/FloatingActionButton'
import {
  formatSessionDuration,
  formatSessionDateTime,
  getSessionName,
  getSessionStatus,
} from '../lib/session-format'
import type { MatchWithDetails } from '../types/database'
import { useI18n } from '../i18n'

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
      const playerMap = new Map<string, { name: string; avatarUrl?: string | null; wins: number; played: number }>()

      for (const match of matches) {
        const winnerTeam = match.teams.find((t) => t.is_winner)
        if (!winnerTeam) continue

        for (const p of match.participants) {
          const team = match.teams.find((t) => t.id === p.team_id)
          if (!team) continue

          const existing = playerMap.get(p.player_id)
          if (existing) {
            existing.played++
            if (team.id === winnerTeam.id) existing.wins++
          } else {
            playerMap.set(p.player_id, {
              name: p.player.name,
              avatarUrl: p.player.avatar_url,
              wins: team.id === winnerTeam.id ? 1 : 0,
              played: 1,
            })
          }
        }
      }

      let best: { name: string; avatarUrl?: string | null; wins: number; played: number } | null = null
      for (const [, p] of playerMap) {
        if (!best || p.wins > best.wins || (p.wins === best.wins && p.played < best.played)) {
          best = p
        }
      }

      const topPlayer =
        best && best.played > 0
          ? {
              name: best.name,
              avatarUrl: best.avatarUrl,
              record: t('units.winLossPlayed', { wins: best.wins, losses: best.played - best.wins, played: best.played }),
              winRate: Math.round((best.wins / best.played) * 100),
            }
          : undefined

      stats.set(sessionId, { matchCount: matches.length, topPlayer })
    }

    return stats
  }, [allMatches, t])

  const isLoading = sessionsLoading || matchesLoading
  const isError = sessionsError || matchesError

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
        style={{ paddingTop: 'max(var(--space-7), env(safe-area-inset-top) + var(--space-5))' }}
      >
        <h1
          className="text-[48px] font-extrabold leading-[1.05] tracking-[-0.03em] mb-[var(--space-2)]"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
        >
          {t('sessions.title')}
        </h1>
        {subtitle && (
          <p className="text-[13px]" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* List */}
      <div className="px-[var(--space-5)] space-y-[var(--space-3)] pb-32">
        {isLoading ? (
          <LoadingState message={t('sessions.loading')} />
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

      <FloatingActionButton
        onClick={() => navigate('/sessions/new')}
        icon={<Plus className="w-6 h-6" />}
        ariaLabel={t('sessions.createNew')}
      />
    </div>
    </PullToRefresh>
  )
}
