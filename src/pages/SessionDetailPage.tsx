import { useNavigate, useParams, useLocation } from 'react-router-dom'
import type { Session } from '../types/database'

// ── Date / duration helpers ────────────────────────────────────────────────

function formatSessionDate(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatSessionTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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

function getSessionMeta(session: Session, status: 'scheduled' | 'live' | 'ended'): string {
  const startedAt = new Date(session.started_at).getTime()
  if (status === 'live') return `${formatDurationMs(Date.now() - startedAt)} elapsed`
  if (status === 'scheduled') return `Starts in ${formatDurationMs(startedAt - Date.now())}`
  if (status === 'ended' && session.ended_at)
    return `${formatDurationMs(new Date(session.ended_at).getTime() - startedAt)} total`
  return '—'
}
import { useMatches, useDeleteMatch } from '../hooks/useMatches'
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
import { Plus, X, ChevronLeft, MoreVertical, Play, Activity, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function SessionDetailPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: matches, isLoading: matchesLoading, isError: matchesError, refetch: refetchMatches } = useMatches(sessionId)
  const { data: session } = useSession(sessionId)
  const deleteMatch = useDeleteMatch()
  const endSession = useEndSession()
  const startSession = useStartSession()
  const deleteSession = useDeleteSession()

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [swipedMatchId, setSwipedMatchId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmEndOpen, setConfirmEndOpen] = useState(false)
  const [confirmDeleteSessionOpen, setConfirmDeleteSessionOpen] = useState(false)

  if (!sessionId) {
    return (
      <div className="min-h-svh bg-[var(--bg)] px-4 py-5">
        <p className="text-sm text-gray-400">Session not found.</p>
      </div>
    )
  }

  const sid = sessionId

  const { sortedByWins } = usePlayerStats(sid)
  const { data: players } = usePlayers()

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
    ? `${sessionStatus === 'ended' ? 'MVP' : 'Leading'} · ${Math.round((mvpPlayer.wins / mvpPlayer.matchesPlayed) * 100)}%`
    : undefined
  const mvpAvatarUrl = mvpPlayer
    ? (players?.find((p) => p.id === mvpPlayer.playerId)?.avatar_url ?? null)
    : null

  async function handleDeleteMatch(matchId: string) {
    setSwipedMatchId(null)
    try {
      await deleteMatch.mutateAsync(matchId)
      setDeleteId(null)
    } catch (err) {
      console.error('Failed to delete match:', err)
      alert('Failed to delete match. Please try again.')
    }
  }

  async function handleEndSession() {
    try {
      await endSession.mutateAsync(sid)
      setConfirmEndOpen(false)
    } catch (err) {
      console.error('Failed to end session:', err)
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

  return (
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
                {sessionStatus === 'live' ? 'Live · in progress'
                  : sessionStatus === 'scheduled' ? 'Scheduled'
                  : 'Completed'}
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
              {session.label ?? 'Untitled Session'}
            </h1>

            {/* Datetime + duration */}
            <div
              className="flex items-center flex-wrap gap-[var(--space-2)]"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}
            >
              <span>
                <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>
                  {formatSessionDate(session.started_at)}
                </strong>
                {' · '}{formatSessionTime(session.started_at)}
              </span>
              <span
                className="flex-shrink-0 rounded-full"
                style={{ width: 3, height: 3, background: 'var(--border)' }}
              />
              {sessionStatus && <span>{getSessionMeta(session, sessionStatus)}</span>}
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
                  Matches
                </h2>
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.08em]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                >
                  {matchesLoading ? 'Loading…' : matchesError ? '—' : `${matches?.length ?? 0} played`}
                </span>
              </div>

              <MatchesContent
                matches={matches}
                isLoading={matchesLoading}
                isError={matchesError}
                onRetry={refetchMatches}
                swipedMatchId={swipedMatchId}
                onSwipeOpen={setSwipedMatchId}
                onSwipeClose={() => setSwipedMatchId(null)}
                onDeleteRequest={setDeleteId}
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
          ariaLabel="Add match"
          bottomOffset="1.5rem"
        />
      )}

      {/* Menu sheet */}
      <BottomSheet open={menuOpen} onClose={closeMenu}>
        {sessionStatus === 'live' && (
          <BottomSheetItem
            icon={<Plus className="w-5 h-5" />}
            label="New match"
            onClick={() => { closeMenu(); navigate(`/sessions/${sid}/matches/new`) }}
          />
        )}
        {sessionStatus === 'scheduled' && (
          <BottomSheetItem
            icon={<Play className="w-5 h-5" />}
            label="Start session"
            onClick={() => { closeMenu(); handleStartSession() }}
          />
        )}
        {(matches?.length ?? 0) > 0 && (
          <BottomSheetItem
            icon={<Activity className="w-5 h-5" />}
            label="View player stats"
            onClick={closeMenu}
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
              label="End session"
              danger
              onClick={() => { closeMenu(); setConfirmEndOpen(true) }}
            />
          </>
        )}
        <BottomSheetItem
          icon={<Trash2 className="w-5 h-5" />}
          label="Delete session"
          danger
          onClick={() => { closeMenu(); setConfirmDeleteSessionOpen(true) }}
        />
        <BottomSheetCancel onClick={closeMenu} />
      </BottomSheet>

      {/* End session confirmation */}
      <Dialog
        open={confirmEndOpen}
        onClose={() => setConfirmEndOpen(false)}
        title="End this session?"
        description="Match scores will be locked and rankings will be finalised. You can still view matches after ending."
        kind="warning"
        actions={[
          { label: 'Cancel', variant: 'secondary', onClick: () => setConfirmEndOpen(false) },
          { label: endSession.isPending ? 'Ending…' : 'End session', variant: 'primary', onClick: handleEndSession },
        ]}
      />

      {/* Delete session confirmation */}
      <Dialog
        open={confirmDeleteSessionOpen}
        onClose={() => setConfirmDeleteSessionOpen(false)}
        title="Delete session?"
        description="This session and all its matches will be permanently deleted. This can't be undone."
        kind="danger"
        actions={[
          { label: 'Cancel', variant: 'secondary', onClick: () => setConfirmDeleteSessionOpen(false) },
          { label: deleteSession.isPending ? 'Deleting…' : 'Delete', variant: 'danger', onClick: handleDeleteSession },
        ]}
      />

      {/* Delete match confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-gray-900">Delete Match?</p>
              <button onClick={() => setDeleteId(null)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">This will remove the match and all its scores.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMatch(deleteId)}
                disabled={deleteMatch.isPending}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-600 text-white"
              >
                {deleteMatch.isPending ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
