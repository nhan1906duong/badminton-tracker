import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlayer, useUpdatePlayer } from '../hooks/usePlayers'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { useBestPartner } from '../hooks/useBestPartner'
import { usePlayerMatchHistory } from '../hooks/usePlayerMatchHistory'
import { useHeadToHead } from '../hooks/useHeadToHead'
import { usePlayerRankings } from '../hooks/useRankings'
import type { PartnerEntry } from '../hooks/useBestPartner'
import { useAvatarUpload, useAvatarDelete, useSetDefaultAvatar } from '../hooks/useAvatarUpload'
import { useIsAdmin } from '../hooks/useIsAdmin'
import Avatar from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'
import { AppBar, Badge, PullToRefresh, SegmentedControl } from '../../design-system/components'
import { formatCurrency, LOSS_PENALTY_VND } from '../lib/currency'
import { formatShortPlayerName } from '../lib/player-name'
import type { MatchWithDetails, Session } from '../types/database'
import { ChevronLeft, ChevronDown, ChevronRight, Pencil, Swords, Users, History, Activity } from 'lucide-react'
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

type PlayerTab = 'partners' | 'h2h' | 'history'

export default function PlayerDetailPage() {
  const { locale, t } = useI18n()
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()
  const id = playerId ?? ''

  const { data: player, isLoading: playerLoading, refetch: refetchPlayer } = usePlayer(id)
  const { stats } = usePlayerStats()
  const { best: bestPartner, worst: worstPartner, isLoading: partnerLoading } = useBestPartner(id)
  const { history, isLoading: historyLoading } = usePlayerMatchHistory(id)
  const { entries: h2hEntries, isLoading: h2hLoading } = useHeadToHead(id)
  const { data: rankings } = usePlayerRankings()
  const rankData = rankings?.find((r) => r.playerId === id)

  const [activeTab, setActiveTab] = useState<PlayerTab>('partners')
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [showAllH2H, setShowAllH2H] = useState(false)
  const [isStuck, setIsStuck] = useState(false)

  const isAdmin = useIsAdmin()
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
  }, [player])

  const handleSaveName = useCallback(() => {
    if (player && editName.trim() && editName.trim() !== player.name) {
      updatePlayer.mutate({ id: player.id, name: editName.trim() })
    }
    setIsEditingName(false)
  }, [player, editName, updatePlayer])

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
    { id: 'partners' as const, label: t('players.tabPartners'), icon: <Users style={{ width: 13, height: 13 }} /> },
    { id: 'h2h' as const, label: t('players.tabH2H'), icon: <Swords style={{ width: 13, height: 13 }} /> },
    { id: 'history' as const, label: t('players.tabHistory'), icon: <History style={{ width: 13, height: 13 }} /> },
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
        safeArea
      />

      {/* Header */}
      <header style={{ padding: 'var(--space-4) var(--space-5) var(--space-5)' }}>
        {/* 1. Rank */}
        {rankData && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent)',
              marginBottom: 'var(--space-3)',
            }}
          >
            {t('common.rank', { rank: rankData.rank })}
          </div>
        )}

        {/* 2. Avatar */}
        {isAdmin ? (
          <button
            onClick={() => setShowAvatarPicker(true)}
            aria-label={t('players.changeAvatar')}
            className="active:opacity-70 transition-opacity"
            style={{ marginBottom: 'var(--space-3)' }}
          >
            <Avatar src={player.avatar_url} name={player.name} size={52} />
          </button>
        ) : (
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <Avatar src={player.avatar_url} name={player.name} size={52} />
          </div>
        )}

        {/* 3. Name + edit */}
        {isAdmin && isEditingName ? (
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
        ) : isAdmin ? (
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

        {/* 4. Rating */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--muted)',
          }}
        >
          {t('players.ratingPts', { rating: player.rating })}
        </div>
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

        {/* Tab bar */}
        <SegmentedControl
          tabs={tabs}
          value={activeTab}
          onChange={setActiveTab}
        />

        {/* ── Partners tab ── */}
        {activeTab === 'partners' && (
          <div
            className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
            style={{ borderRadius: 'var(--radius-lg)' }}
          >
            {partnerLoading ? (
              <div className="p-4">
                <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              </div>
            ) : !bestPartner ? (
              <div className="p-4">
                <p className="text-[13px]" style={{ color: 'var(--muted)' }}>{t('players.noDoublesYet')}</p>
              </div>
            ) : (
              <>
                <PartnerRow label={t('players.bestPartner')} entry={bestPartner} />
                {worstPartner && (
                  <>
                    <div style={{ height: 1, background: 'var(--border)' }} />
                    <PartnerRow label={t('players.worstPartner')} entry={worstPartner} />
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Head to Head tab ── */}
        {activeTab === 'h2h' && (
          <div
            className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
            style={{ borderRadius: 'var(--radius-lg)' }}
          >
            {h2hLoading ? (
              <div className="p-4">
                <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              </div>
            ) : h2hEntries.length === 0 ? (
              <div className="p-4">
                <p className="text-[13px]" style={{ color: 'var(--muted)' }}>{t('players.noDoublesYet')}</p>
              </div>
            ) : (
              <>
                {(showAllH2H ? h2hEntries : h2hEntries.slice(0, 5)).map((entry, i) => {
                  const winRate = entry.totalMatches > 0 ? entry.wins / entry.totalMatches : 0
                  const isWinning = entry.wins > entry.losses
                  const isTied = entry.wins === entry.losses
                  return (
                    <div
                      key={entry.opponent.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <span
                        className="text-[11px] font-bold w-4 text-right shrink-0"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                      >
                        {i + 1}
                      </span>
                      <Avatar src={entry.opponent.avatar_url} name={entry.opponent.name} size={32} />
                      <p className="text-[14px] font-medium flex-1 min-w-0 truncate" style={{ color: 'var(--fg)' }}>
                        {entry.opponent.name}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="text-[13px] font-bold"
                          style={{ color: isWinning ? 'var(--success)' : isTied ? 'var(--muted)' : 'var(--danger)' }}
                        >
                          {entry.wins} {t('players.wins')}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--border)' }}>·</span>
                        <span className="text-[13px] font-bold" style={{ color: 'var(--muted)' }}>
                          {entry.losses} {t('players.losses')}
                        </span>
                        <span
                          className="text-[11px] w-8 text-right"
                          style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                        >
                          {Math.round(winRate * 100)}%
                        </span>
                      </div>
                    </div>
                  )
                })}

                {h2hEntries.length > 5 && (
                  <button
                    onClick={() => setShowAllH2H((v) => !v)}
                    className="w-full py-2.5 text-[13px] font-semibold active:bg-[var(--bg)]"
                    style={{ color: 'var(--accent)' }}
                  >
                    {showAllH2H ? t('players.showLess') : t('players.showAll', { count: h2hEntries.length })}
                  </button>
                )}
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
                  const completedMatches = matches.filter((m) => m.status === 'COMPLETED')
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
                          <p
                            className="text-[11px] mt-0.5"
                            style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                          >
                            {t('units.match', { count: completedMatches.length })} ·{' '}
                            <span style={{ color: 'var(--success)' }}>{sWins}W</span>{' '}
                            <span style={{ color: 'var(--danger)' }}>{sLosses}L</span>
                          </p>
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
      </div>

      {isAdmin && showAvatarPicker && (
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

function PartnerRow({ label, entry }: { label: string; entry: PartnerEntry }) {
  const { t } = useI18n()
  return (
    <div className="px-4 py-3">
      <p
        className="text-[11px] font-bold uppercase tracking-[0.06em] mb-1.5"
        style={{ color: 'var(--muted)' }}
      >
        {label}
      </p>
      <div className="flex items-center gap-2">
        <Avatar src={entry.partner.avatar_url} name={entry.partner.name} size={20} />
        <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--fg)' }}>
          {entry.partner.name}
          <span className="text-[13px] font-normal" style={{ color: 'var(--muted)' }}>
            {' · '}{entry.wins} {t('players.wins')}/{entry.totalMatches - entry.wins} {t('players.losses')} · {Math.round(entry.winRate * 100)}%
          </span>
        </p>
      </div>
    </div>
  )
}
