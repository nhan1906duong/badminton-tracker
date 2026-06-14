import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlayer, useUpdatePlayer } from '../hooks/usePlayers'
import { usePlayerMatchHistory } from '../hooks/usePlayerMatchHistory'
import { usePlayerPointsHistory } from '../hooks/usePlayerPointsHistory'
import { type RatingChartPoint } from '../components/RatingChart'
import { usePlayerRankings } from '../hooks/useRankings'
import { usePlayerAchievements } from '../hooks/usePlayerAchievements'
import { usePlayerBadges } from '../hooks/usePlayerBadges'
import { useAvatarUpload, useAvatarDelete, useSetDefaultAvatar } from '../hooks/useAvatarUpload'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useIsAdmin } from '../hooks/useIsAdmin'
import AvatarPicker from '../components/AvatarPicker'
import { PlayerCardImage } from '../components/PlayerCardImage'
import { PlayerMatchHistoryItem } from '../components/PlayerMatchHistoryItem'
import PlayerRecordLine from '../components/PlayerRecordLine'
import { PlayerRacketHeaderCard } from '../components/PlayerRacketHeaderCard'
import { AppBar, BottomSheet, BottomSheetItem, BottomSheetCancel, PullToRefresh } from '../../design-system/components'
import { formatSessionLabel } from '../lib/session-label'
import { PlayerOverviewCard } from '../components/PlayerOverviewCard'
import { PlayerRankingChartContent } from '../components/PlayerRankingChartContent'
import { PlayerH2HContent } from '../components/PlayerH2HContent'
import { PlayerPartnersContent } from '../components/PlayerPartnersContent'
import { Camera, ChevronLeft, ChevronDown, ChevronRight, Pencil, Swords, Users, MoreVertical, TrendingUp } from 'lucide-react'
import { useI18n } from '../i18n'

const OVERVIEW_IMAGES = ['overview-1.jpg', 'overview-2.jpg', 'overview-3.jpg', 'overview-4.jpg']

export default function PlayerDetailPage() {
  const { locale, t } = useI18n()
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()
  const id = playerId ?? ''

  const { data: player, isLoading: playerLoading, refetch: refetchPlayer } = usePlayer(id)
  const { history, isLoading: historyLoading } = usePlayerMatchHistory(id)
  const { history: pointsHistory } = usePlayerPointsHistory(id)

  const { data: rankings } = usePlayerRankings()
  const { achievements, isLoading: achievementsLoading } = usePlayerAchievements(id)
  const { badges, isLoading: badgesLoading } = usePlayerBadges(id)

  const chartData = useMemo<RatingChartPoint[]>(() => {
    const winSessionIds = new Set(
      achievements.filter((a) => a.type === 'win').map((a) => a.session.id),
    )
    return [...pointsHistory]
      .reverse()
      .flatMap(({ session, matches }) => {
        const lastMatch = matches[matches.length - 1]
        const rating = lastMatch?.points.rating_after
        if (rating == null) return []
        return [{ rating, date: session.started_at, isWin: winSessionIds.has(session.id) }]
      })
  }, [pointsHistory, achievements])
  const rankData = rankings?.find((r) => r.playerId === id)

  const hasOverview =
    !achievementsLoading &&
    !badgesLoading &&
    (achievements.some((a) => a.type === 'win' || a.type === 'runner_up') || badges.length > 0)

  const [sheet, setSheet] = useState<'menu' | 'ranking' | 'h2h' | 'partners' | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [isStuck, setIsStuck] = useState(false)
  const sessionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [bgImage] = useState(() => OVERVIEW_IMAGES[Math.floor(Math.random() * OVERVIEW_IMAGES.length)])

  const { user } = useAuth()
  const { data: myProfile } = useProfile(user?.id)
  const isAdmin = useIsAdmin()
  const isMe = !!myProfile?.player_id && myProfile.player_id === id
  const canEdit = isMe || isAdmin

  const updatePlayer = useUpdatePlayer()
  const uploadAvatar = useAvatarUpload()
  const removeAvatar = useAvatarDelete()
  const setDefaultAvatar = useSetDefaultAvatar()

  useEffect(() => {
    const onScroll = () => setIsStuck(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const wins = rankData?.wins ?? 0
  const losses = rankData?.losses ?? 0
  const total = rankData?.matchesPlayed ?? 0
  const winRatePercent = total > 0 ? Math.round((wins / total) * 100) : 0

  const handleStartEditName = useCallback(() => {
    if (player) {
      setEditName(player.name)
      setIsEditingName(true)
    }
  }, [player, setEditName, setIsEditingName])

  const handleSaveName = useCallback(() => {
    if (player && editName.trim() && editName.trim() !== player.name) {
      updatePlayer.mutate({ id: player.id, name: editName.trim() })
    }
    setIsEditingName(false)
  }, [player, editName, updatePlayer, setIsEditingName])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSaveName()
      if (e.key === 'Escape') setIsEditingName(false)
    },
    [handleSaveName]
  )

  const handleRefresh = useCallback(async () => {
    await refetchPlayer()
  }, [refetchPlayer])

  function toggleSession(sessionId: string) {
    setExpandedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  function jumpToSession(sessionId: string) {
    setExpandedSessions((prev) => new Set(prev).add(sessionId))
    sessionRefs.current.get(sessionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (playerLoading) {
    return (
      <div className="min-h-svh bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-svh bg-[var(--bg)] flex items-center justify-center">
        <span className="text-[13px]" style={{ color: 'var(--muted)' }}>{t('players.notFound')}</span>
      </div>
    )
  }

  return (
    <>
      {/* Fixed page background — random overview image, centered and width-fit, doesn't scroll with content */}
      <div aria-hidden className="fixed inset-0 flex justify-center overflow-hidden pointer-events-none" style={{ zIndex: 0, background: 'var(--bg)' }}>
        <img
          src={`/overview/${bgImage}`}
          alt=""
          style={{ width: '100%', height: 'auto', objectFit: 'contain', mixBlendMode: 'multiply', position: 'absolute', top: '30%' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'color-mix(in oklch, var(--bg) 95%, transparent)' }}
        />
      </div>

    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-svh relative" style={{ zIndex: 1 }}>
      {/* Hero: AppBar + header share a background avatar watermark, bleeding up behind the status bar */}
      <div style={{ position: 'relative', overflow: 'hidden', zIndex: 61, marginTop: 'calc(-1 * env(safe-area-inset-top))', minHeight: 'min(48vw, 246px)' }}>
        {/* Background avatar watermark — tap to edit */}
        {canEdit ? (
          <button
            onClick={() => setShowAvatarPicker(true)}
            aria-label={t('players.changeAvatar')}
            className="absolute inset-0 w-full h-full active:opacity-90 transition-opacity"
            style={{ zIndex: 0 }}
          >
            <PlayerCardImage avatarUrl={player.avatar_url} name={player.name} />
          </button>
        ) : (
          <div aria-hidden className="absolute inset-0" style={{ zIndex: 0, pointerEvents: 'none' }}>
            <PlayerCardImage avatarUrl={player.avatar_url} name={player.name} />
          </div>
        )}
        <div
          aria-hidden
          style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, var(--bg) 100%)', pointerEvents: 'none', zIndex: 0 }}
        />

        <div style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <AppBar
          title=''
          leftAction={{
            icon: <ChevronLeft className="w-5 h-5" />,
            onClick: () => navigate(-1),
          }}
          rightAction={{
            ariaLabel: t('common.moreOptions'),
            icon: <MoreVertical className="w-5 h-5" />,
            onClick: () => setSheet('menu'),
          }}
          stuck={isStuck}
          style={{
            background: 'transparent',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            borderColor: 'transparent',
          }}
        />

        {/* Edit avatar icon */}
        {canEdit && (
          <button
            onClick={() => setShowAvatarPicker(true)}
            aria-label={t('players.changeAvatar')}
            className="absolute active:opacity-70 transition-opacity flex items-center justify-center"
            style={{
              bottom: 'var(--space-3)',
              right: 'var(--space-5)',
              width: 32,
              height: 32,
              zIndex: 1,
              pointerEvents: 'auto',
            }}
          >
            <Camera className="w-5 h-5" style={{ color: 'var(--muted)', opacity: 0.5 }} />
          </button>
        )}

        {/* Header */}
        <header style={{ padding: 'var(--space-3) var(--space-5) var(--space-2)', position: 'relative', pointerEvents: 'none' }}>
          <div style={{ position: 'relative' }}>
            <div className="min-w-0" style={{ width: '66.6667%', pointerEvents: 'auto' }}>
              {isEditingName ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    lineHeight: 1.3,
                    color: 'var(--fg)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '2px solid var(--accent)',
                    outline: 'none',
                    width: '100%',
                    padding: 0,
                    display: 'block',
                  }}
                />
              ) : canEdit ? (
                <button
                  onClick={handleStartEditName}
                  className="active:opacity-70 text-left w-full"
                >
                  <h1
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-xl)',
                      fontWeight: 800,
                      lineHeight: 1.3,
                      letterSpacing: '-0.04em',
                      color: 'var(--fg)',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {player.name}
                    <Pencil className="inline-block w-4 h-4 ml-1.5 align-middle" style={{ color: 'var(--muted)', opacity: 0.5 }} />
                  </h1>
                </button>
              ) : (
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 800,
                    lineHeight: 1.3,
                    letterSpacing: '-0.04em',
                    color: 'var(--fg)',
                    overflowWrap: 'break-word',
                  }}
                >
                  {player.name}
                </h1>
              )}
            </div>

            {/* Rank · Rating · You */}
            <div
              className="flex items-center flex-wrap"
              style={{ gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}
            >
              {rankData && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--accent)',
                  }}
                >
                  {t('common.rank', { rank: rankData.rank })}
                </span>
              )}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  letterSpacing: '0.02em',
                }}
              >
                {t('players.ratingPts', { rating: player.rating })}
              </span>
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
                  }}
                >
                  {t('common.you')}
                </span>
              )}
            </div>

            {/* Total matches · W-L · Rate */}
            <PlayerRecordLine
              matchesPlayed={total}
              wins={wins}
              losses={losses}
              winRate={winRatePercent}
              fontSize={12}
              marginTop="var(--space-2)"
            />
          </div>
        </header>
        </div>

        {/* Overview — champion/runner-up sessions + award badges; shares the hero background */}
        <div className="px-4">
          <PlayerOverviewCard achievements={achievements} badges={badges} locale={locale} isLoading={achievementsLoading || badgesLoading} onSessionClick={jumpToSession} />
        </div>
      </div>

      <div className="px-4 pb-24 space-y-4">
        {/* Rackets — header card with newest racket, tap to view all */}
        <div style={{ marginTop: hasOverview ? 0 : 'var(--space-2)' }}>
          <PlayerRacketHeaderCard playerId={id} canEdit={canEdit} isMe={isMe} />
        </div>

        {/* ── History ── */}
        <div className="space-y-2">
            {historyLoading ? (
              <div className="p-4">
                <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              </div>
            ) : history.length === 0 ? (
              <div
                className="bg-[var(--surface)] border border-[var(--border)] p-4"
                style={{ borderRadius: 'var(--radius-lg)' }}
              >
                <p className="text-[13px]" style={{ color: 'var(--muted)' }}>{t('players.noSessionsYet')}</p>
              </div>
            ) : (
              <>
                <div
                  className="text-[11px] font-bold uppercase tracking-[0.1em] px-1"
                  style={{ color: 'var(--muted)' }}
                >
                  {t('players.sessionsCount', { count: history.length })}
                </div>

                {history.map(({ session, matches, wins: sWins, losses: sLosses }) => {
                  const isExpanded = expandedSessions.has(session.id)
                  const completedMatches = matches.filter((m) => m.status === 'COMPLETED' && m.teams.some((t) => t.is_winner))
                  const sessionWinRate = completedMatches.length > 0 ? Math.round((sWins / completedMatches.length) * 100) : 0
                  return (
                    <div
                      key={session.id}
                      ref={(el) => {
                        if (el) sessionRefs.current.set(session.id, el)
                        else sessionRefs.current.delete(session.id)
                      }}
                      className="bg-[var(--surface)] overflow-hidden"
                    >
                      <button
                        onClick={() => toggleSession(session.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 active:bg-[var(--bg)]"
                      >
                        <div className="flex-1 min-w-0 text-left">
                          <p
                            className="text-[15px] font-semibold truncate"
                            style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
                          >
                            {formatSessionLabel(session, locale)}
                          </p>
                          <PlayerRecordLine
                            matchesPlayed={completedMatches.length}
                            wins={sWins}
                            losses={sLosses}
                            winRate={sessionWinRate}
                            marginTop={2}
                          />
                        </div>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} />
                          : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} />
                        }
                      </button>

                      {isExpanded && (
                        <div className="divide-y divide-[var(--border)]" style={{ borderTop: '1px solid var(--border)' }}>
                          {completedMatches.length === 0 ? (
                            <div className="px-4 py-3">
                              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>{t('players.noCompletedMatches')}</p>
                            </div>
                          ) : (
                            completedMatches.map((match) => (
                              <PlayerMatchHistoryItem key={match.id} match={match} playerId={id} />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>

      </div>

      <AvatarPicker
        open={showAvatarPicker}
        currentAvatarUrl={player.avatar_url}
        onSelect={(file) => uploadAvatar.mutate({ file, entity: 'players', id: player.id })}
        onSelectDefault={(url) =>
          setDefaultAvatar.mutate({ url, entity: 'players', id: player.id, oldAvatarUrl: player.avatar_url })
        }
        onRemove={() =>
          removeAvatar.mutate({ entity: 'players', id: player.id, oldAvatarUrl: player.avatar_url })
        }
        onClose={() => setShowAvatarPicker(false)}
      />

      <BottomSheet open={sheet !== null} onClose={() => setSheet(null)}>
        {sheet === 'menu' && (
          <>
            <BottomSheetItem icon={<TrendingUp size={20} />} label={t('players.rankingChart')} onClick={() => setSheet('ranking')} />
            <BottomSheetItem icon={<Swords size={20} />} label={t('players.tabH2H')} onClick={() => setSheet('h2h')} />
            <BottomSheetItem icon={<Users size={20} />} label={t('players.tabPartners')} onClick={() => setSheet('partners')} />
            <BottomSheetCancel onClick={() => setSheet(null)} />
          </>
        )}
        {sheet === 'ranking' && (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto overscroll-contain">
            <PlayerRankingChartContent data={chartData} />
          </div>
        )}
        {sheet === 'h2h' && (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto overscroll-contain">
            <PlayerH2HContent playerId={id} />
          </div>
        )}
        {sheet === 'partners' && (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto overscroll-contain">
            <PlayerPartnersContent playerId={id} />
          </div>
        )}
      </BottomSheet>
    </div>
    </PullToRefresh>
    </>
  )
}
