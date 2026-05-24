import { useNavigate, useParams, useLocation } from 'react-router-dom'
import type { Session } from '../types/database'
import { LOCALE_TAG, useI18n, type Locale, type TFunction } from '../i18n'

// ── Date / duration helpers ────────────────────────────────────────────────

function formatSessionDate(iso: string, locale: Locale, t: TFunction): string {
  const date = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return t('common.today')
  if (date.toDateString() === tomorrow.toDateString()) return t('common.tomorrow')
  return date.toLocaleDateString(LOCALE_TAG[locale], { month: 'short', day: 'numeric' })
}

function formatSessionTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(LOCALE_TAG[locale], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDurationMs(ms: number): string {
  const totalMinutes = Math.floor(Math.abs(ms) / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function getSessionMeta(session: Session, status: 'scheduled' | 'live' | 'ended', t: TFunction): string {
  const startedAt = new Date(session.started_at).getTime()
  if (status === 'live') return t('units.elapsed', { duration: formatDurationMs(Date.now() - startedAt) })
  if (status === 'scheduled') return t('date.startsIn', { duration: formatDurationMs(startedAt - Date.now()) })
  if (status === 'ended' && session.ended_at)
    return t('units.total', { duration: formatDurationMs(new Date(session.ended_at).getTime() - startedAt) })
  return '—'
}
import { useMatches } from '../hooks/useMatches'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { usePlayers } from '../hooks/usePlayers'
import { useSession, useStartSession, useEndSession, useDeleteSession } from '../hooks/useSessions'
import MatchesContent from '../components/MatchesContent'
import FloatingActionButton from '../components/FloatingActionButton'
import { AppBar } from '../../design-system/components/app-bar'
import { Dialog } from '../../design-system/components/dialog'
import { BottomSheet, BottomSheetItem, BottomSheetDivider, BottomSheetCancel } from '../../design-system/components/bottom-sheet'
import { SessionStatsPanel } from '../../design-system/components/session-stats-panel'
import { formatShortPlayerName } from '../lib/player-name'
import { Plus, ChevronLeft, MoreVertical, Play, Activity, Trash2 } from 'lucide-react'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { useState, useCallback } from 'react'
import { PullToRefresh } from '../../design-system/components'

export default function SessionDetailPage() {
  const { locale, t } = useI18n()
  const isAdmin = useIsAdmin()
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: matches, isLoading: matchesLoading, isError: matchesError, refetch: refetchMatches } = useMatches(sessionId)
  const { data: session } = useSession(sessionId)
  const endSession = useEndSession()
  const startSession = useStartSession()
  const deleteSession = useDeleteSession()
  const sid = sessionId ?? ''
  const { sortedByWins } = usePlayerStats(sid)
  const { data: players } = usePlayers()

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmEndOpen, setConfirmEndOpen] = useState(false)
  const [confirmDeleteSessionOpen, setConfirmDeleteSessionOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!sessionId) {
    return (
      <div className="min-h-svh bg-[var(--bg)] px-4 py-5">
        <p className="text-sm text-gray-400">{t('sessionDetail.notFound')}</p>
      </div>
    )
  }

  const sessionStatus: 'scheduled' | 'live' | 'ended' | null = (() => {
    if (!session) return null
    if (session.ended_at) return 'ended'
    if (session.started_at > new Date().toISOString()) return 'scheduled'
    return 'live'
  })()

  const uniquePlayerCount = matches
    ? new Set(matches.flatMap((m) => m.participants.map((p) => p.player_id))).size
    : 0

  const mvpPlayer = sortedByWins.find((s) => s.matchesPlayed > 0)
  const mvpName = mvpPlayer ? formatShortPlayerName(mvpPlayer.name) : undefined
  const mvpLabel = mvpPlayer
    ? `${sessionStatus === 'ended' ? t('sessionDetail.mvp') : t('sessionDetail.leading')} · ${Math.round((mvpPlayer.wins / mvpPlayer.matchesPlayed) * 100)}%`
    : undefined
  const mvpAvatarUrl = mvpPlayer
    ? (players?.find((p) => p.id === mvpPlayer.playerId)?.avatar_url ?? null)
    : null

  async function handleEndSession() {
    try {
      setActionError(null)
      await endSession.mutateAsync(sid)
      setConfirmEndOpen(false)
    } catch (err) {
      console.error('Failed to end session:', err)
      setConfirmEndOpen(false)
      setActionError(err instanceof Error ? err.message : t('sessionDetail.couldntEnd'))
    }
  }

  async function handleStartSession() {
    try {
      await startSession.mutateAsync(sid)
    } catch (err) {
      console.error('Failed to start session:', err)
    }
  }

  async function handleDeleteSession() {
    try {
      await deleteSession.mutateAsync(sid)
      setConfirmDeleteSessionOpen(false)
      navigate(backTo)
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  function openMenu() { setMenuOpen(true) }
  function closeMenu() { setMenuOpen(false) }

  const backTo = (location.state as { from?: string } | null)?.from ?? '/sessions'

  const handleRefresh = useCallback(async () => {
    await refetchMatches()
  }, [refetchMatches])

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
      <AppBar
        title=""
        leftAction={{
          icon: <ChevronLeft className="w-5 h-5 -ml-1" />,
          onClick: () => navigate(backTo),
        }}
        rightAction={{
          icon: <MoreVertical className="w-5 h-5" />,
          onClick: openMenu,
        }}
      />

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'max(120px, calc(env(safe-area-inset-bottom) + 104px))' }}
      >
        {/* Hero — eyebrow · title · datetime */}
        {session && (
          <header style={{ padding: 'var(--space-4) var(--space-5) var(--space-5)' }}>
            {/* Eyebrow */}
            <div
              className="inline-flex items-center gap-[var(--space-2)]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: sessionStatus === 'live' ? 'var(--accent)'
                  : sessionStatus === 'scheduled' ? 'var(--fg)'
                  : 'var(--muted)',
                marginBottom: 'var(--space-3)',
                minHeight: 18,
              }}
            >
              {sessionStatus === 'live' && (
                <span
                  className="rounded-full animate-pulse flex-shrink-0"
                  style={{ width: 8, height: 8, background: 'var(--accent)' }}
                />
              )}
              <span>
                {sessionStatus === 'live' ? t('sessionDetail.statusLive')
                  : sessionStatus === 'scheduled' ? t('sessionDetail.statusScheduled')
                  : t('sessionDetail.statusCompleted')}
              </span>
            </div>

            {/* Title */}
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-3xl)',
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: '-0.035em',
                marginBottom: 'var(--space-3)',
                color: 'var(--fg)',
              }}
            >
              {session.label ?? t('common.untitledSession')}
            </h1>

            {/* Datetime + duration */}
            <div
              className="flex items-center flex-wrap gap-[var(--space-2)]"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}
            >
              <span>
                <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>
                  {formatSessionDate(session.started_at, locale, t)}
                </strong>
                {' · '}{formatSessionTime(session.started_at, locale)}
              </span>
              <span
                className="flex-shrink-0 rounded-full"
                style={{ width: 3, height: 3, background: 'var(--border)' }}
              />
              {sessionStatus && <span>{getSessionMeta(session, sessionStatus, t)}</span>}
            </div>
          </header>
        )}

        <div className="px-[var(--space-5)] space-y-6">
          {/* Stats panel */}
          {(matches?.length ?? 0) > 0 && (
            <SessionStatsPanel
              matchCount={matches?.length ?? 0}
              playerCount={uniquePlayerCount}
              mvpName={mvpName}
              mvpLabel={mvpLabel}
              mvpAvatarUrl={mvpAvatarUrl}
              onPress={() => navigate(`/sessions/${sid}/stats`)}
            />
          )}


          {/* Matches */}
          {sessionStatus !== 'scheduled' && (
            <section className="space-y-[var(--space-4)]">
              <div className="flex items-baseline justify-between gap-[var(--space-3)]">
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 800,
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    color: 'var(--fg)',
                  }}
                >
                  {t('sessionDetail.matches')}
                </h2>
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.08em]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                >
                  {matchesLoading ? t('common.loadingEllipsis') : matchesError ? '—' : t('units.matchesPlayed', { count: matches?.length ?? 0 })}
                </span>
              </div>

              <MatchesContent
                matches={matches}
                isLoading={matchesLoading}
                isError={matchesError}
                onRetry={refetchMatches}
              />
            </section>
          )}
        </div>
      </div>

      {/* FAB — Add Match (live only) */}
      {sessionStatus === 'live' && (
        <FloatingActionButton
          onClick={() => navigate(`/sessions/${sid}/matches/new`)}
          icon={<Plus className="w-6 h-6" />}
          ariaLabel={t('sessionDetail.addMatch')}
          bottomOffset="1.5rem"
        />
      )}

      {/* Menu sheet */}
      <BottomSheet open={menuOpen} onClose={closeMenu}>
        {sessionStatus === 'live' && (
          <BottomSheetItem
            icon={<Plus className="w-5 h-5" />}
            label={t('sessionDetail.newMatch')}
            onClick={() => { closeMenu(); navigate(`/sessions/${sid}/matches/new`) }}
          />
        )}
        {sessionStatus === 'scheduled' && (
          <BottomSheetItem
            icon={<Play className="w-5 h-5" />}
            label={t('sessionDetail.startSession')}
            onClick={() => { closeMenu(); handleStartSession() }}
          />
        )}
        {(matches?.length ?? 0) > 0 && (
          <BottomSheetItem
            icon={<Activity className="w-5 h-5" />}
            label={t('sessionDetail.viewPlayerStats')}
            onClick={() => { closeMenu(); navigate(`/sessions/${sid}/stats`) }}
          />
        )}
        {/* Share session — planned */}
        {/* Rename — planned */}
        {sessionStatus === 'live' && (
          <>
            <BottomSheetDivider />
            <BottomSheetItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              }
              label={t('sessionDetail.endSession')}
              danger
              onClick={() => { closeMenu(); setConfirmEndOpen(true) }}
            />
          </>
        )}
        {isAdmin && (
          <BottomSheetItem
            icon={<Trash2 className="w-5 h-5" />}
            label={t('sessionDetail.deleteSession')}
            danger
            onClick={() => { closeMenu(); setConfirmDeleteSessionOpen(true) }}
          />
        )}
        <BottomSheetCancel onClick={closeMenu} />
      </BottomSheet>

      {/* End session confirmation */}
      <Dialog
        open={confirmEndOpen}
        onClose={() => setConfirmEndOpen(false)}
        title={t('sessionDetail.endTitle')}
        description={t('sessionDetail.endDescription')}
        kind="warning"
        actions={[
          { label: t('common.cancel'), variant: 'secondary', onClick: () => setConfirmEndOpen(false) },
          { label: endSession.isPending ? t('common.ending') : t('sessionDetail.endSession'), variant: 'primary', onClick: handleEndSession },
        ]}
      />

      {/* Delete session confirmation */}
      <Dialog
        open={confirmDeleteSessionOpen}
        onClose={() => setConfirmDeleteSessionOpen(false)}
        title={t('sessionDetail.deleteTitle')}
        description={t('sessionDetail.deleteDescription')}
        kind="danger"
        actions={[
          { label: t('common.cancel'), variant: 'secondary', onClick: () => setConfirmDeleteSessionOpen(false) },
          { label: deleteSession.isPending ? t('common.deleting') : t('common.delete'), variant: 'danger', onClick: handleDeleteSession },
        ]}
      />

      <Dialog
        open={actionError !== null}
        onClose={() => setActionError(null)}
        title={t('sessionDetail.couldntEnd')}
        description={actionError ?? t('common.failedTryAgain')}
        kind="danger"
      />

    </div>
    </PullToRefresh>
  )
}
