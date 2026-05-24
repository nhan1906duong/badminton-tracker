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
import Avatar from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'
import { AppBar, Badge, PullToRefresh } from '../../design-system/components'
import { formatCurrency, LOSS_PENALTY_VND } from '../lib/currency'
import { formatShortPlayerName } from '../lib/player-name'
import type { MatchWithDetails, Session } from '../types/database'
import { ChevronLeft, ChevronDown, ChevronRight, Pencil, Medal, Swords } from 'lucide-react'

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

function formatSessionLabel(session: Session): string {
  return (
    session.label ??
    new Date(session.started_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  )
}

export default function PlayerDetailPage() {
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

  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [h2hExpanded, setH2HExpanded] = useState(true)
  const [showAllH2H, setShowAllH2H] = useState(false)
  const [isStuck, setIsStuck] = useState(false)

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
        <span className="text-[13px]" style={{ color: 'var(--muted)' }}>Player not found</span>
      </div>
    )
  }

  const handleRefresh = useCallback(async () => {
    await refetchPlayer()
  }, [refetchPlayer])

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

      {/* Hero */}
      <div
        className="flex flex-col items-center gap-3 px-6 pt-5 pb-6 bg-[var(--surface)]"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Rank number */}
        {rankData && (
          <div
            aria-label={`Rank ${rankData.rank}`}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 80,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              userSelect: 'none',
              fontVariantNumeric: 'tabular-nums',
              color:
                rankData.rank === 1 ? 'color-mix(in oklch, var(--accent) 35%, transparent)'
                : rankData.rank === 2 ? 'color-mix(in oklch, var(--accent) 20%, transparent)'
                : rankData.rank === 3 ? 'color-mix(in oklch, var(--accent) 10%, transparent)'
                : 'color-mix(in oklch, var(--border) 80%, transparent)',
            }}
          >
            {rankData.rank}
          </div>
        )}

        <button
          onClick={() => setShowAvatarPicker(true)}
          aria-label="Change avatar"
          className="active:opacity-70 transition-opacity"
        >
          <Avatar src={player.avatar_url} name={player.name} size={60} />
        </button>

        {isEditingName ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            autoFocus
            className="text-[24px] font-extrabold text-center bg-transparent outline-none w-full max-w-xs pb-1"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--fg)',
              borderBottom: '2px solid var(--accent)',
            }}
          />
        ) : (
          <button
            onClick={handleStartEditName}
            className="flex items-center gap-2 active:opacity-70"
          >
            <span
              className="text-[24px] font-extrabold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
            >
              {player.name}
            </span>
            <Pencil className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} />
          </button>
        )}

        <span className="text-[13px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
          {player.rating} pts
        </span>
      </div>

      <div className="px-4 pt-5 pb-24 space-y-3">
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Played" value={total} />
          <StatCard label="Win %" value={winRateStr} valueColor="var(--accent)" />
          <StatCard label="Wins" value={wins} valueColor="var(--success)" />
          <StatCard label="Losses" value={losses} valueColor="var(--danger)" />
        </div>

        {/* Donation */}
        <div
          className="bg-[var(--surface)] border border-[var(--border)] px-4 py-3 flex items-center justify-between"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <span className="text-[13px]" style={{ color: 'var(--muted)' }}>Total Donated</span>
          <span
            className="text-[18px] font-extrabold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
          >
            {formatCurrency(donated)}
          </span>
        </div>

        {/* Partner stats */}
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
              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>No doubles matches yet.</p>
            </div>
          ) : (
            <>
              <PartnerRow
                label="Best Partner"
                icon={<Medal className="w-4 h-4" style={{ color: 'var(--success)' }} />}
                entry={bestPartner}
              />
              {worstPartner && (
                <>
                  <div style={{ height: 1, background: 'var(--border)' }} />
                  <PartnerRow
                    label="Worst Partner"
                    icon={<Medal className="w-4 h-4" style={{ color: 'var(--danger)' }} />}
                    entry={worstPartner}
                  />
                </>
              )}
            </>
          )}
        </div>

        {/* Head to Head */}
        {!h2hLoading && h2hEntries.length > 0 && (
          <div
            className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
            style={{ borderRadius: 'var(--radius-lg)' }}
          >
            <AppBar
              title="Head to Head"
              titleAlign="left"
              className="!static !z-auto"
              style={{ background: 'var(--surface)', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
              leftAction={{
                icon: <Swords className="w-[18px] h-[18px]" />,
                ariaLabel: 'Head to Head',
                onClick: () => setH2HExpanded((v) => !v),
              }}
              rightAction={{
                icon: h2hExpanded
                  ? <ChevronDown className="w-[18px] h-[18px]" />
                  : <ChevronRight className="w-[18px] h-[18px]" />,
                ariaLabel: h2hExpanded ? 'Collapse' : 'Expand',
                onClick: () => setH2HExpanded((v) => !v),
              }}
            />

            {h2hExpanded && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
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
                        {formatShortPlayerName(entry.opponent.name)}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="text-[13px] font-bold"
                          style={{ color: isWinning ? 'var(--success)' : isTied ? 'var(--muted)' : 'var(--danger)' }}
                        >
                          {entry.wins}W
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--border)' }}>·</span>
                        <span className="text-[13px] font-bold" style={{ color: 'var(--muted)' }}>
                          {entry.losses}L
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
                    {showAllH2H ? 'Show less' : `Show all ${h2hEntries.length}`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Session History */}
        {!historyLoading && history.length > 0 && (
          <div className="space-y-2 pt-1">
            <div
              className="text-[11px] font-bold uppercase tracking-[0.1em] px-1"
              style={{ color: 'var(--muted)' }}
            >
              Sessions ({history.length})
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
                        {formatSessionLabel(session)}
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
                      >
                        {completedMatches.length} matches ·{' '}
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
                          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>No completed matches</p>
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
                                    ? `w/ ${row.teammates} · vs ${row.opponents || '—'}`
                                    : `vs ${row.opponents || '—'}`}
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

function StatCard({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string | number
  valueColor?: string
}) {
  return (
    <div
      className="bg-[var(--surface)] border border-[var(--border)] p-3 flex flex-col items-center gap-1"
      style={{ borderRadius: 'var(--radius-lg)' }}
    >
      <span
        className="text-[20px] font-extrabold leading-none"
        style={{ fontFamily: 'var(--font-display)', color: valueColor ?? 'var(--fg)' }}
      >
        {value}
      </span>
      <span
        className="text-[10px] font-bold uppercase tracking-[0.06em]"
        style={{ color: 'var(--muted)' }}
      >
        {label}
      </span>
    </div>
  )
}

function PartnerRow({ label, icon, entry }: { label: string; icon: React.ReactNode; entry: PartnerEntry }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-2">
          {icon}
          <span
            className="text-[11px] font-bold uppercase tracking-[0.06em]"
            style={{ color: 'var(--muted)' }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar src={entry.partner.avatar_url} name={entry.partner.name} size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--fg)' }}>
              {formatShortPlayerName(entry.partner.name)}
            </p>
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
              {entry.wins}W / {entry.totalMatches - entry.wins}L · {Math.round(entry.winRate * 100)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
