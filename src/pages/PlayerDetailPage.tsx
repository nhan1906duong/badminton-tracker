import { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlayer, useUpdatePlayer } from '../hooks/usePlayers'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { useBestPartner } from '../hooks/useBestPartner'
import { usePlayerMatchHistory } from '../hooks/usePlayerMatchHistory'
import { usePlayerPointsHistory } from '../hooks/usePlayerPointsHistory'
import { RatingChart, type RatingChartPoint } from '../components/RatingChart'
import { useHeadToHead } from '../hooks/useHeadToHead'
import { usePlayerRankings } from '../hooks/useRankings'
import { usePlayerAchievements } from '../hooks/usePlayerAchievements'
import { usePlayerBadges } from '../hooks/usePlayerBadges'
import { PlayerBadgesStrip } from '../components/PlayerBadgesStrip'

import type { PlayerAchievement } from '../hooks/usePlayerAchievements'
import { useAvatarUpload, useAvatarDelete, useSetDefaultAvatar } from '../hooks/useAvatarUpload'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useIsAdmin } from '../hooks/useIsAdmin'
import Avatar from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'
import PlayerRecordLine from '../components/PlayerRecordLine'
import { AppBar, Badge, PullToRefresh, SegmentedControl, BwfCategoryBadge } from '../../design-system/components'
import { formatCurrency, LOSS_PENALTY_VND } from '../lib/currency'
import { formatShortPlayerName } from '../lib/player-name'
import type { MatchWithDetails, Session } from '../types/database'
import { Camera, ChevronLeft, ChevronDown, ChevronRight, Pencil, Swords, Users, History, Activity } from 'lucide-react'
import { LOCALE_TAG, useI18n, type Locale } from '../i18n'

const MATCH_TYPE_SHORT: Record<string, string> = {
  MEN_SINGLES: 'MS',
  WOMEN_SINGLES: 'WS',
  MEN_DOUBLES: 'MD',
  WOMEN_DOUBLES: 'WD',
  MIXED_DOUBLES: 'XD',
}

function getMatchRow(match: MatchWithDetails, playerId: string) {
  const pp = match.participants.find((p) => p.player_id === playerId)
  if (!pp) return null
  const playerTeam = match.teams.find((t) => t.id === pp.team_id)
  if (!playerTeam) return null
  if (!match.teams.some((t) => t.is_winner)) return null
  const isTeamA = playerTeam.team_label === 'TEAM_A'
  const teammates = match.participants
    .filter((p) => p.team_id === pp.team_id && p.player_id !== playerId)
    .map((p) => formatShortPlayerName(p.player.name))
  const opponents = match.participants
    .filter((p) => p.team_id !== pp.team_id)
    .map((p) => formatShortPlayerName(p.player.name))
  const scoreStr = match.scores
    .map((s) => {
      const my = isTeamA ? s.team_a_score : s.team_b_score
      const opp = isTeamA ? s.team_b_score : s.team_a_score
      return `${my}–${opp}`
    })
    .join(', ')
  return {
    isWin: playerTeam.is_winner,
    teammates: teammates.join(' & '),
    opponents: opponents.join(' & '),
    scoreStr: scoreStr || '—',
    type: MATCH_TYPE_SHORT[match.match_type] ?? '—',
  }
}

function formatSessionLabel(session: Session, locale: Locale): string {
  return (
    session.label ??
    new Date(session.started_at).toLocaleDateString(LOCALE_TAG[locale], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  )
}

type PlayerTab = 'partners' | 'h2h' | 'history' | 'achievements'

export default function PlayerDetailPage() {
  const { locale, t } = useI18n()
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()
  const id = playerId ?? ''

  const { data: player, isLoading: playerLoading, refetch: refetchPlayer } = usePlayer(id)
  const { stats } = usePlayerStats()
  const { allPartners, isLoading: partnerLoading } = useBestPartner(id)
  const { history, isLoading: historyLoading } = usePlayerMatchHistory(id)
  const { history: pointsHistory } = usePlayerPointsHistory(id)

  const { entries: h2hEntries, isLoading: h2hLoading } = useHeadToHead(id)
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

  const [activeTab, setActiveTab] = useState<PlayerTab>('achievements')
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [expandedPartners, setExpandedPartners] = useState<Set<string>>(new Set())
  const [expandedH2H, setExpandedH2H] = useState<Set<string>>(new Set())
  const [isStuck, setIsStuck] = useState(false)

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

  const playerStats = stats.find((s) => s.playerId === id)
  const total = playerStats?.matchesPlayed ?? 0
  const wins = playerStats?.wins ?? 0
  const losses = playerStats?.losses ?? 0
  const winRateStr = total > 0 ? `${Math.round((wins / total) * 100)}%` : '—'
  const donated = losses * LOSS_PENALTY_VND

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

  const tabs = [
    { id: 'achievements' as const, label: t('players.tabAchievements'), icon: <MedalIcon size={13} /> },
    { id: 'history' as const, label: t('players.tabHistory'), icon: <History style={{ width: 13, height: 13 }} /> },
    { id: 'h2h' as const, label: t('players.tabH2H'), icon: <Swords style={{ width: 13, height: 13 }} /> },
    { id: 'partners' as const, label: t('players.tabPartners'), icon: <Users style={{ width: 13, height: 13 }} /> },
  ]

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-svh bg-[var(--bg)]">
      <AppBar
        title=''
        leftAction={{
          icon: <ChevronLeft className="w-5 h-5" />,
          onClick: () => navigate(-1),
        }}
        stuck={isStuck}
      />

      {/* Header */}
      <header style={{ padding: 'var(--space-4) var(--space-5) var(--space-5)', position: 'relative' }}>
        {/* 1. Rank + You chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {rankData && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--accent)',
              }}
            >
              {t('common.rank', { rank: rankData.rank })}
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
              }}
            >
              {t('common.you')}
            </span>
          )}
        </div>

        {/* 2. Avatar */}
        {canEdit ? (
          <button
            onClick={() => setShowAvatarPicker(true)}
            aria-label={t('players.changeAvatar')}
            className="relative active:opacity-70 transition-opacity"
            style={{ marginBottom: 'var(--space-3)' }}
          >
            <Avatar src={player.avatar_url} name={player.name} size={52} />
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[var(--accent)] rounded-full flex items-center justify-center border-2 border-[var(--bg)]">
              <Camera className="w-3 h-3 text-[var(--surface)]" />
            </div>
          </button>
        ) : (
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <Avatar src={player.avatar_url} name={player.name} size={52} />
          </div>
        )}

        {/* 3. Name + edit */}
        {isEditingName ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.02,
              color: 'var(--fg)',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid var(--accent)',
              outline: 'none',
              width: '100%',
              padding: 0,
              display: 'block',
              marginBottom: 'var(--space-2)',
            }}
          />
        ) : canEdit ? (
          <button
            onClick={handleStartEditName}
            className="flex items-center gap-2 active:opacity-70 text-left"
            style={{ marginBottom: 'var(--space-2)' }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-3xl)',
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: '-0.035em',
                color: 'var(--fg)',
              }}
            >
              {player.name}
            </h1>
            <Pencil className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} />
          </button>
        ) : (
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: '-0.035em',
              color: 'var(--fg)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {player.name}
          </h1>
        )}

        {/* 4. Rating below name */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            color: 'var(--muted)',
            marginBottom: 'var(--space-2)',
            letterSpacing: '0.02em',
          }}
        >
          ({t('players.ratingPts', { rating: player.rating })})
        </div>

        {/* Milestone badges strip */}
        <PlayerBadgesStrip badges={badges} isLoading={badgesLoading} />
      </header>

      <div className="px-4 pb-24 space-y-4">
        {/* Stats panel — 4 cells + footer, mirrors SessionStatsPanel */}
        <div
          className="overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            <PlayerStatCell value={String(total)} label={t('players.played')} />
            <PlayerStatCell value={winRateStr} label={t('players.winPercent')} accent divider />
            <PlayerStatCell value={String(wins)} label={t('players.wins')} divider />
            <PlayerStatCell value={String(losses)} label={t('players.losses')} divider />
          </div>
          <div
            className="flex items-center justify-between"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderTop: '1px solid var(--border)',
              background: 'color-mix(in oklch, var(--bg) 50%, transparent)',
            }}
          >
            <span
              className="inline-flex items-center gap-[var(--space-2)]"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--accent)',
              }}
            >
              <Activity size={14} aria-hidden />
              {t('players.totalDonated')}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-base)',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                color: 'var(--fg)',
              }}
            >
              {formatCurrency(donated)}
            </span>
          </div>
        </div>

        {/* Rating history chart */}
        {chartData.length >= 2 && (
          <div
            className="overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
            }}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3"
              style={{ color: 'var(--muted)' }}
            >
              {t('players.ratingHistory')}
            </div>
            <RatingChart data={chartData} />
          </div>
        )}

        {/* Tab bar */}
        <SegmentedControl
          tabs={tabs}
          value={activeTab}
          onChange={setActiveTab}
        />

        {/* ── Partners tab ── */}
        {activeTab === 'partners' && (
          <div className="space-y-2">
            {partnerLoading ? (
              <div className="p-4">
                <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              </div>
            ) : allPartners.length === 0 ? (
              <div
                className="bg-[var(--surface)] border border-[var(--border)] p-4"
                style={{ borderRadius: 'var(--radius-lg)' }}
              >
                <p className="text-[13px]" style={{ color: 'var(--muted)' }}>{t('players.noDoublesYet')}</p>
              </div>
            ) : (
              <>
                <div
                  className="text-[11px] font-bold uppercase tracking-[0.1em] px-1"
                  style={{ color: 'var(--muted)' }}
                >
                  {t('players.partnersCount', { count: allPartners.length })}
                </div>
                {allPartners.map((entry) => {
                  const isExpanded = expandedPartners.has(entry.partner.id)
                  const losses = entry.totalMatches - entry.wins
                  const winRate = Math.round(entry.winRate * 100)
                  return (
                    <div
                      key={entry.partner.id}
                      className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
                      style={{ borderRadius: 'var(--radius-lg)' }}
                    >
                      <button
                        onClick={() =>
                          setExpandedPartners((prev) => {
                            const next = new Set(prev)
                            if (next.has(entry.partner.id)) next.delete(entry.partner.id)
                            else next.add(entry.partner.id)
                            return next
                          })
                        }
                        className="w-full flex items-center gap-3 px-4 py-3 active:bg-[var(--bg)]"
                      >
                        <Avatar src={entry.partner.avatar_url} name={entry.partner.name} size={32} />
                        <div className="flex-1 min-w-0 text-left">
                          <p
                            className="text-[15px] font-semibold truncate"
                            style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
                          >
                            {entry.partner.name}
                          </p>
                          <PlayerRecordLine
                            matchesPlayed={entry.totalMatches}
                            wins={entry.wins}
                            losses={losses}
                            winRate={winRate}
                            marginTop={2}
                          />
                        </div>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} />
                          : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} />
                        }
                      </button>

                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                          {entry.matches.map((match) => {
                            const row = getMatchRow(match, id)
                            if (!row) return null
                            return (
                              <div
                                key={match.id}
                                className="flex items-center gap-3 px-4 py-2.5"
                                style={{ borderBottom: '1px solid var(--border)' }}
                              >
                                <Badge variant={row.isWin ? 'win' : 'loss'}>
                                  {row.isWin ? 'W' : 'L'}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] truncate" style={{ color: 'var(--fg)' }}>
                                    {row.teammates
                                      ? t('players.withOpponent', { teammates: row.teammates, opponents: row.opponents || '—' })
                                      : t('players.vsOpponent', { opponents: row.opponents || '—' })}
                                  </p>
                                  <p
                                    className="text-[11px]"
                                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                                  >
                                    {row.scoreStr}
                                  </p>
                                </div>
                                <span
                                  className="text-[11px] font-bold uppercase tracking-[0.06em] shrink-0"
                                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                                >
                                  {row.type}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* ── Head to Head tab ── */}
        {activeTab === 'h2h' && (
          <div className="space-y-2">
            {h2hLoading ? (
              <div className="p-4">
                <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              </div>
            ) : h2hEntries.length === 0 ? (
              <div
                className="bg-[var(--surface)] border border-[var(--border)] p-4"
                style={{ borderRadius: 'var(--radius-lg)' }}
              >
                <p className="text-[13px]" style={{ color: 'var(--muted)' }}>{t('players.noDoublesYet')}</p>
              </div>
            ) : (
              <>
                <div
                  className="text-[11px] font-bold uppercase tracking-[0.1em] px-1"
                  style={{ color: 'var(--muted)' }}
                >
                  {t('players.h2hCount', { count: h2hEntries.length })}
                </div>
                {h2hEntries.map((entry) => {
                  const isExpanded = expandedH2H.has(entry.opponent.id)
                  const winRate = Math.round(entry.totalMatches > 0 ? (entry.wins / entry.totalMatches) * 100 : 0)
                  return (
                    <div
                      key={entry.opponent.id}
                      className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
                      style={{ borderRadius: 'var(--radius-lg)' }}
                    >
                      <button
                        onClick={() =>
                          setExpandedH2H((prev) => {
                            const next = new Set(prev)
                            if (next.has(entry.opponent.id)) next.delete(entry.opponent.id)
                            else next.add(entry.opponent.id)
                            return next
                          })
                        }
                        className="w-full flex items-center gap-3 px-4 py-3 active:bg-[var(--bg)]"
                      >
                        <Avatar src={entry.opponent.avatar_url} name={entry.opponent.name} size={32} />
                        <div className="flex-1 min-w-0 text-left">
                          <p
                            className="text-[15px] font-semibold truncate"
                            style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
                          >
                            {entry.opponent.name}
                          </p>
                          <PlayerRecordLine
                            matchesPlayed={entry.totalMatches}
                            wins={entry.wins}
                            losses={entry.losses}
                            winRate={winRate}
                            marginTop={2}
                          />
                        </div>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} />
                          : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} />
                        }
                      </button>

                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                          {entry.matches.map((match) => {
                            const row = getMatchRow(match, id)
                            if (!row) return null
                            return (
                              <div
                                key={match.id}
                                className="flex items-center gap-3 px-4 py-2.5"
                                style={{ borderBottom: '1px solid var(--border)' }}
                              >
                                <Badge variant={row.isWin ? 'win' : 'loss'}>
                                  {row.isWin ? 'W' : 'L'}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] truncate" style={{ color: 'var(--fg)' }}>
                                    {row.teammates
                                      ? t('players.withOpponent', { teammates: row.teammates, opponents: row.opponents || '—' })
                                      : t('players.vsOpponent', { opponents: row.opponents || '—' })}
                                  </p>
                                  <p
                                    className="text-[11px]"
                                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                                  >
                                    {row.scoreStr}
                                  </p>
                                </div>
                                <span
                                  className="text-[11px] font-bold uppercase tracking-[0.06em] shrink-0"
                                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                                >
                                  {row.type}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* ── History tab ── */}
        {activeTab === 'history' && (
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
                <p className="text-[13px]" style={{ color: 'var(--muted)' }}>{t('players.noCompletedMatches')}</p>
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
                      className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
                      style={{ borderRadius: 'var(--radius-lg)' }}
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
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                          {completedMatches.length === 0 ? (
                            <div className="px-4 py-3">
                              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>{t('players.noCompletedMatches')}</p>
                            </div>
                          ) : (
                            completedMatches.map((match) => {
                              const row = getMatchRow(match, id)
                              if (!row) return null
                              return (
                                <div
                                  key={match.id}
                                  className="flex items-center gap-3 px-4 py-2.5"
                                  style={{ borderBottom: '1px solid var(--border)' }}
                                >
                                  <Badge variant={row.isWin ? 'win' : 'loss'}>
                                    {row.isWin ? 'W' : 'L'}
                                  </Badge>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] truncate" style={{ color: 'var(--fg)' }}>
                                      {row.teammates
                                        ? t('players.withOpponent', { teammates: row.teammates, opponents: row.opponents || '—' })
                                        : t('players.vsOpponent', { opponents: row.opponents || '—' })}
                                    </p>
                                    <p
                                      className="text-[11px]"
                                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                                    >
                                      {row.scoreStr}
                                    </p>
                                  </div>
                                  <span
                                    className="text-[11px] font-bold uppercase tracking-[0.06em] shrink-0"
                                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                                  >
                                    {row.type}
                                  </span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* ── Achievements tab ── */}
        {activeTab === 'achievements' && (
          <div className="space-y-2">
            {achievementsLoading ? (
              <div className="p-4">
                <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              </div>
            ) : achievements.length === 0 ? (
              <div
                className="bg-[var(--surface)] border border-[var(--border)] p-4"
                style={{ borderRadius: 'var(--radius-lg)' }}
              >
                <p className="text-[13px]" style={{ color: 'var(--muted)' }}>{t('players.noAchievements')}</p>
              </div>
            ) : (
              <>
                <div
                  className="text-[11px] font-bold uppercase tracking-[0.1em] px-1"
                  style={{ color: 'var(--muted)' }}
                >
                  {(() => {
                    const titles = achievements.filter((a) => a.type === 'win').length
                    const runnerUps = achievements.filter((a) => a.type === 'runner_up').length
                    return t('players.achievementsSummary', { titles, runnerUps })
                  })()}
                </div>
                <div
                  className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
                  style={{ borderRadius: 'var(--radius-lg)' }}
                >
                  {achievements.map((a, i) => (
                    <AchievementRow
                      key={a.session.id}
                      achievement={a}
                      locale={locale}
                      isLast={i === achievements.length - 1}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showAvatarPicker && (
        <AvatarPicker
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
      )}
    </div>
    </PullToRefresh>
  )
}

function PlayerStatCell({
  value,
  label,
  accent = false,
  divider = false,
}: {
  value: string
  label: string
  accent?: boolean
  divider?: boolean
}) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        padding: 'var(--space-4) var(--space-3)',
        gap: 4,
        borderLeft: divider ? '1px solid var(--border)' : undefined,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontFeatureSettings: '"tnum" 1',
          color: accent ? 'var(--accent)' : 'var(--fg)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: accent ? 'var(--accent)' : 'var(--muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}
      >
        {label}
      </span>
    </div>
  )
}


function AchievementRow({
  achievement,
  locale,
  isLast,
}: {
  achievement: PlayerAchievement
  locale: Locale
  isLast: boolean
}) {
  const isWin = achievement.type === 'win'
  const losses = achievement.matchesPlayed - achievement.wins
  const winRate = achievement.matchesPlayed > 0 ? Math.round((achievement.wins / achievement.matchesPlayed) * 100) : 0

  return (
    <div
      className="flex items-start gap-3 px-4 py-3"
      style={{ borderBottom: isLast ? undefined : '1px solid var(--border)' }}
    >
      {/* Rank badge */}
      <div className="shrink-0 pt-0.5">
        <RankBadge rank={isWin ? 1 : 2} />
      </div>

      {/* Content: name + badge on row 1, stats on row 2 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className="text-[15px] font-semibold truncate"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
          >
            {formatSessionLabel(achievement.session, locale)}
          </p>
          {achievement.session.bwf_tournaments && (
            <BwfCategoryBadge
              categoryName={achievement.session.bwf_tournaments.category_name}
              categorySlug={achievement.session.bwf_tournaments.category_slug}
            />
          )}
        </div>
        <PlayerRecordLine
          matchesPlayed={achievement.matchesPlayed}
          wins={achievement.wins}
          losses={losses}
          winRate={winRate}
          marginTop={2}
        />
      </div>
    </div>
  )
}

function RankBadge({ rank }: { rank: 1 | 2 }) {
  const isGold = rank === 1
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle
        cx="11"
        cy="11"
        r="10"
        fill={isGold ? '#F5E6A3' : '#E8E8E8'}
        stroke={isGold ? '#D4A843' : '#B0B0B0'}
        strokeWidth="1.5"
      />
      <text
        x="11"
        y="15"
        textAnchor="middle"
        fill={isGold ? '#8B6914' : '#666666'}
        fontSize="12"
        fontWeight="700"
        fontFamily="var(--font-mono)"
      >
        {rank}
      </text>
    </svg>
  )
}

function MedalIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="5" />
      <path d="M8.5 13.5L6 21l6-3 6 3-2.5-7.5" />
    </svg>
  )
}
