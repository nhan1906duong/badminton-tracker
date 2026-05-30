import { useNavigate, useParams, useLocation } from 'react-router-dom'
import type { Session } from '../types/database'
import { LOCALE_TAG, useI18n, type Locale, type TFunction, matchTypeLabel } from '../i18n'
import { useLeagueTeams } from '../hooks/useLeagueTeams'
import { useLeagueStandings } from '../hooks/useLeagueStandings'
import LeagueStandingsTable from '../components/LeagueStandingsTable'
import LeagueScheduleGrid from '../components/LeagueScheduleGrid'
import LeagueTeamEditor from '../components/LeagueTeamEditor'

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
import { useCreateLeagueSchedule, useMatches } from '../hooks/useMatches'
import { useSessionLeaderboard } from '../hooks/useRankings'
import { useSession, useStartSession, useEndSession, useDeleteSession, useUpdateSessionStartTime, useRenameSession, useUpdateLeagueTotalRounds } from '../hooks/useSessions'
import MatchesContent from '../components/MatchesContent'
import FloatingActionButton from '../components/FloatingActionButton'
import { AppBar } from '../../design-system/components/app-bar'
import { Dialog } from '../../design-system/components/dialog'
import { BottomSheet, BottomSheetItem, BottomSheetDivider, BottomSheetCancel } from '../../design-system/components/bottom-sheet'
import { SessionStatsPanel } from '../../design-system/components/session-stats-panel'
import { formatShortPlayerName } from '../lib/player-name'
import { Plus, ChevronLeft, MoreVertical, Play, Activity, Trash2, Wallet, Pencil, Share2, Users } from 'lucide-react'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { usePlayerStats, useSessionDonationStats } from '../hooks/usePlayerStats'
import { generateSessionShareCard } from '../lib/share-card'
import { Button } from '../../design-system/components/button'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { PullToRefresh, BwfCategoryBadge } from '../../design-system/components'

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
  const { data: leaderboard, refetch: refetchLeaderboard } = useSessionLeaderboard(sid)

  const updateSessionStartTime = useUpdateSessionStartTime()
  const renameSession = useRenameSession()
  const updateLeagueTotalRounds = useUpdateLeagueTotalRounds()

  const { stats } = usePlayerStats(sessionId)
  const { totalDonatedVnd } = useSessionDonationStats(sessionId ?? '')

  // League data
  const { data: leagueTeams } = useLeagueTeams(sessionId)
  const standings = useLeagueStandings(sessionId)
  const createLeagueSchedule = useCreateLeagueSchedule()

  const isLeague = session?.type === 'league'

  const sharePlayers = useMemo(
    () => [...stats].filter((p) => p.matchesPlayed > 0).sort((a, b) => b.losses - a.losses),
    [stats],
  )

  const [sharePreview, setSharePreview] = useState<{ dataUrl: string; blob: Blob } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmEndOpen, setConfirmEndOpen] = useState(false)
  const [confirmDeleteSessionOpen, setConfirmDeleteSessionOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editTimeOpen, setEditTimeOpen] = useState(false)
  const [editTimeValue, setEditTimeValue] = useState('')
  const [editLabelOpen, setEditLabelOpen] = useState(false)
  const [editLabelValue, setEditLabelValue] = useState('')
  const [teamEditorOpen, setTeamEditorOpen] = useState(false)
  const [confirmAddRoundOpen, setConfirmAddRoundOpen] = useState(false)
  const leagueScheduleEnsuredRef = useRef<string | null>(null)

  useEffect(() => {
    if (!session || !isLeague || !leagueTeams || !matches) return
    if (!session.league_match_type || !session.league_total_rounds) return
    const expectedMatchCount = (leagueTeams.length * (leagueTeams.length - 1) / 2) * session.league_total_rounds
    if (matches.length >= expectedMatchCount || leagueTeams.length < 2 || createLeagueSchedule.isPending) return
    if (leagueScheduleEnsuredRef.current === session.id) return

    leagueScheduleEnsuredRef.current = session.id
    createLeagueSchedule.mutate(
      {
        session_id: session.id,
        match_type: session.league_match_type,
        total_rounds: session.league_total_rounds,
        played_at: session.started_at,
        teams: leagueTeams.map(team => ({
          id: team.id,
          playerIds: team.players.map(player => player.id),
        })),
      },
      {
        onError: () => {
          leagueScheduleEnsuredRef.current = null
        },
      },
    )
  }, [createLeagueSchedule, isLeague, leagueTeams, matches, session])

  function toDatetimeLocal(iso: string): string {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  async function handleSaveScheduledTime() {
    if (!editTimeValue) return
    await updateSessionStartTime.mutateAsync({ id: sid, started_at: new Date(editTimeValue).toISOString() })
    setEditTimeOpen(false)
  }

  async function handleSaveLabel() {
    await renameSession.mutateAsync({ id: sid, label: editLabelValue })
    setEditLabelOpen(false)
  }

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchMatches(), refetchLeaderboard()])
  }, [refetchMatches, refetchLeaderboard])

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

  const recordedMatches = matches?.filter((m) => m.status === 'COMPLETED' && m.teams.some((t) => t.is_winner)) ?? []
  const liveMatchCount = matches?.filter((m) => m.status === 'LIVE').length ?? 0
  const matchCount = matches?.length ?? 0
  const isDeletingCompletedSessionWithMatches = sessionStatus === 'ended' && matchCount > 0

  const uniquePlayerCount = recordedMatches.length > 0
    ? new Set(recordedMatches.flatMap((m) => m.participants.map((p) => p.player_id))).size
    : 0

  const mvpPlayer = leaderboard?.leader
  const mvpName = mvpPlayer ? formatShortPlayerName(mvpPlayer.name) : undefined
  const mvpLabel = mvpPlayer
    ? `${sessionStatus === 'ended' ? t('sessionDetail.mvp') : t('sessionDetail.leading')} · ${Math.round((mvpPlayer.wins / mvpPlayer.matchesPlayed) * 100)}%`
    : undefined
  const mvpAvatarUrl = mvpPlayer?.avatarUrl ?? null

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

  function handleAddLeagueRound() {
    closeMenu()
    setConfirmAddRoundOpen(true)
  }

  async function handleConfirmAddLeagueRound() {
    if (!session?.league_total_rounds || !leagueTeams || !session.league_match_type) return
    leagueScheduleEnsuredRef.current = null
    await updateLeagueTotalRounds.mutateAsync({ id: sid, league_total_rounds: session.league_total_rounds + 1 })
    setConfirmAddRoundOpen(false)
  }

  function openMenu() { setMenuOpen(true) }
  function closeMenu() { setMenuOpen(false) }

  function handleSharePreview() {
    if (!session) return
    closeMenu()
    try {
      const result = generateSessionShareCard({
        session,
        players: sharePlayers,
        totalDonatedVnd,
        matchCount: recordedMatches.length,
      })
      setSharePreview(result)
    } catch (err) {
      console.error('Failed to generate share card:', err)
    }
  }

  function handleActualShare() {
    if (!sharePreview) return
    const { blob, dataUrl } = sharePreview
    setSharePreview(null)
    const file = new File([blob], 'session-summary.png', { type: 'image/png' })
    const title = session?.label ?? 'Session Summary'
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], title }).catch((err) => {
        if (err instanceof Error && err.name !== 'AbortError') console.error('Share failed:', err)
      })
    } else {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'session-summary.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  const backTo = (location.state as { from?: string } | null)?.from ?? '/sessions'

  return (
    <>
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

            {/* Session type badge */}
            {isLeague && session.league_match_type && (
              <div className="mb-[var(--space-3)]">
                <div
                  className="inline-flex items-center gap-[var(--space-2)] px-2.5 py-1 rounded-full"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                  }}
                >
                  <span>{t('createSession.typeLeague')}</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{matchTypeLabel(session.league_match_type, t)}</span>
                </div>
              </div>
            )}

            {/* Tournament category */}
            {session.bwf_tournaments && (
              <div className="mb-[var(--space-3)]">
                <BwfCategoryBadge
                  categoryName={session.bwf_tournaments.category_name}
                  categorySlug={session.bwf_tournaments.category_slug}
                />
              </div>
            )}

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
          {/* Stats panel (regular/tournament) or Standings (league) */}
          {isLeague ? (
            <LeagueStandingsTable
              standings={standings ?? []}
              isEnded={sessionStatus === 'ended'}
            />
          ) : recordedMatches.length > 0 && (
            <SessionStatsPanel
              matchCount={recordedMatches.length}
              playerCount={uniquePlayerCount}
              mvpName={mvpName}
              mvpLabel={mvpLabel}
              mvpAvatarUrl={mvpAvatarUrl}
              onPress={() => navigate(`/sessions/${sid}/stats`)}
            />
          )}

          {/* League schedule */}
          {isLeague && leagueTeams && leagueTeams.length >= 2 && session.league_total_rounds && (
            <section className="space-y-[var(--space-4)]">
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
                {t('sessionDetail.schedule')}
              </h2>
              <LeagueScheduleGrid
                teams={leagueTeams}
                totalRounds={session.league_total_rounds}
                matches={matches}
                sessionId={sid}
              />
            </section>
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

      {/* FAB — Add Match (live only, non-league sessions) */}
      {sessionStatus === 'live' && !isLeague && (
        <FloatingActionButton
          onClick={() => navigate(`/sessions/${sid}/matches/new`)}
          icon={<Plus className="w-6 h-6" />}
          ariaLabel={t('sessionDetail.addMatch')}
          bottomOffset="1.5rem"
        />
      )}

      {/* Menu sheet */}
      <BottomSheet open={menuOpen} onClose={closeMenu}>
        {sessionStatus === 'live' && !isLeague && (
          <BottomSheetItem
            icon={<Plus className="w-5 h-5" />}
            label={t('sessionDetail.newMatch')}
            onClick={() => { closeMenu(); navigate(`/sessions/${sid}/matches/new`) }}
          />
        )}
        {sessionStatus === 'live' && isLeague && (
          <BottomSheetItem
            icon={<Plus className="w-5 h-5" />}
            label={t('sessionDetail.addRound')}
            onClick={handleAddLeagueRound}
          />
        )}
        {sessionStatus === 'scheduled' && (
          <>
            {isLeague && (
              <BottomSheetItem
                icon={<Users className="w-5 h-5" />}
                label={t('sessionDetail.manageTeams')}
                onClick={() => { closeMenu(); setTeamEditorOpen(true) }}
              />
            )}
            <BottomSheetItem
              icon={<Play className="w-5 h-5" />}
              label={t('sessionDetail.startSession')}
              onClick={() => { closeMenu(); handleStartSession() }}
            />
            <BottomSheetItem
              icon={<Pencil className="w-5 h-5" />}
              label={t('sessionDetail.editScheduledTime')}
              onClick={() => { closeMenu(); setEditTimeValue(toDatetimeLocal(session!.started_at)); setEditTimeOpen(true) }}
            />
          </>
        )}
        {isAdmin && !session?.bwf_tournament_id && (
          <BottomSheetItem
            icon={<Pencil className="w-5 h-5" />}
            label={t('sessionDetail.renameSession')}
            onClick={() => { closeMenu(); setEditLabelValue(session?.label ?? ''); setEditLabelOpen(true) }}
          />
        )}
        {(matches?.length ?? 0) > 0 && (
          <BottomSheetItem
            icon={<Activity className="w-5 h-5" />}
            label={t('sessionDetail.viewPlayerStats')}
            onClick={() => { closeMenu(); navigate(`/sessions/${sid}/stats`) }}
          />
        )}
        {(matches?.length ?? 0) > 0 && (
          <BottomSheetItem
            icon={<Wallet className="w-5 h-5" />}
            label={t('sessionDetail.viewDonations')}
            onClick={() => { closeMenu(); navigate(`/sessions/${sid}/donated`) }}
          />
        )}
        {sessionStatus === 'ended' && recordedMatches.length > 0 && (
          <BottomSheetItem
            icon={<Share2 className="w-5 h-5" />}
            label={t('sessionDetail.shareSession')}
            onClick={handleSharePreview}
          />
        )}
        {(sessionStatus === 'live' || isAdmin) && <BottomSheetDivider />}
        {sessionStatus === 'live' && (
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
        title={liveMatchCount > 0 ? t('sessionDetail.endWithLiveTitle') : t('sessionDetail.endTitle')}
        description={liveMatchCount > 0 ? t('sessionDetail.endWithLiveDescription', { count: liveMatchCount }) : t('sessionDetail.endDescription')}
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
        title={isDeletingCompletedSessionWithMatches ? t('sessionDetail.deleteCompletedWithMatchesTitle') : t('sessionDetail.deleteTitle')}
        description={
          isDeletingCompletedSessionWithMatches
            ? t('sessionDetail.deleteCompletedWithMatchesDescription', { count: matchCount })
            : t('sessionDetail.deleteDescription')
        }
        kind="danger"
        actions={[
          { label: t('common.cancel'), variant: 'secondary', onClick: () => setConfirmDeleteSessionOpen(false) },
          { label: deleteSession.isPending ? t('common.deleting') : t('common.delete'), variant: 'danger', onClick: handleDeleteSession },
        ]}
      />

      <BottomSheet open={editTimeOpen} onClose={() => setEditTimeOpen(false)}>
        <div style={{ padding: '0 var(--space-4) var(--space-2)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 'var(--space-4)' }}>
            {t('sessionDetail.editScheduledTime')}
          </div>
          <input
            type="datetime-local"
            value={editTimeValue}
            onChange={e => setEditTimeValue(e.target.value)}
            style={{ width: '100%', padding: 'var(--space-3) var(--space-4)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', color: 'var(--fg)', marginBottom: 'var(--space-4)', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" onClick={() => setEditTimeOpen(false)} style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer', minHeight: 48, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', touchAction: 'manipulation' }}>
              {t('common.cancel')}
            </button>
            <button type="button" onClick={handleSaveScheduledTime} disabled={!editTimeValue || updateSessionStartTime.isPending}
              style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 600, cursor: editTimeValue ? 'pointer' : 'not-allowed', minHeight: 48, border: 'none', background: editTimeValue ? 'var(--accent)' : 'var(--border)', color: editTimeValue ? 'var(--surface)' : 'var(--muted)', opacity: editTimeValue ? 1 : 0.6, touchAction: 'manipulation' }}>
              {t('sessionDetail.saveTime')}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={editLabelOpen} onClose={() => setEditLabelOpen(false)}>
        <div style={{ padding: '0 var(--space-4) var(--space-2)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 'var(--space-4)' }}>
            {t('sessionDetail.renameSession')}
          </div>
          <input
            type="text"
            value={editLabelValue}
            onChange={e => setEditLabelValue(e.target.value)}
            placeholder={t('sessionDetail.renamePlaceholder')}
            style={{ width: '100%', padding: 'var(--space-3) var(--space-4)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--fg)', marginBottom: 'var(--space-4)', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" onClick={() => setEditLabelOpen(false)} style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer', minHeight: 48, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', touchAction: 'manipulation' }}>
              {t('common.cancel')}
            </button>
            <button type="button" onClick={handleSaveLabel} disabled={renameSession.isPending}
              style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer', minHeight: 48, border: 'none', background: 'var(--accent)', color: 'var(--surface)', touchAction: 'manipulation' }}>
              {t('sessionDetail.saveName')}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* League Team Editor */}
      {isLeague && sessionStatus === 'scheduled' && leagueTeams && session?.league_match_type && (
        <LeagueTeamEditor
          teams={leagueTeams}
          matchType={session.league_match_type}
          sessionId={sid}
          open={teamEditorOpen}
          onClose={() => setTeamEditorOpen(false)}
        />
      )}

      <Dialog
        open={confirmAddRoundOpen}
        onClose={() => setConfirmAddRoundOpen(false)}
        title={t('sessionDetail.addRoundTitle')}
        description={t('sessionDetail.addRoundDescription', { round: (session?.league_total_rounds ?? 0) + 1 })}
        kind="warning"
        actions={[
          { label: t('common.cancel'), variant: 'secondary', onClick: () => setConfirmAddRoundOpen(false) },
          { label: updateLeagueTotalRounds.isPending ? t('common.creatingEllipsis') : t('sessionDetail.addRound'), variant: 'primary', onClick: handleConfirmAddLeagueRound },
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

    {/* Share preview modal */}
    {sharePreview && (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-end px-4 pb-8"
        style={{ background: 'oklch(0% 0 0 / 0.60)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={() => setSharePreview(null)}
      >
        <div
          className="w-full max-w-sm overflow-hidden"
          style={{
            borderRadius: 'var(--radius-xl)',
            background: 'var(--surface)',
            boxShadow: '0 8px 32px oklch(0% 0 0 / 0.24)',
            maxHeight: '85dvh',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ overflowY: 'auto', padding: '16px 16px 8px' }}>
            <img
              src={sharePreview.dataUrl}
              alt="Session summary"
              style={{ width: '100%', display: 'block', borderRadius: 12 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, padding: '8px 16px 16px' }}>
            <Button variant="secondary" size="block" onClick={() => setSharePreview(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="accent" size="block" onClick={handleActualShare}>
              {t('common.share')}
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
