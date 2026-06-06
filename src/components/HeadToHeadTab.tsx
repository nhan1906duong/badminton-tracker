import { useState, useMemo } from 'react'
import { X, Plus } from 'lucide-react'
import { useH2HPairs } from '../hooks/useH2HPairs'
import { usePlayers } from '../hooks/usePlayers'
import Avatar from './Avatar'
import { Badge } from '../../design-system/components'
import { useI18n } from '../i18n'
import { formatShortPlayerName } from '../lib/player-name'
import type { MatchWithDetails, Player } from '../types/database'

const MATCH_TYPE_SHORT: Record<string, string> = {
  MEN_SINGLES: 'MS',
  WOMEN_SINGLES: 'WS',
  MEN_DOUBLES: 'MD',
  WOMEN_DOUBLES: 'WD',
  MIXED_DOUBLES: 'XD',
}

function getH2HRow(match: MatchWithDetails, teamAIds: string[]) {
  const teamA = match.teams.find((t) => t.team_label === 'TEAM_A')
  const teamB = match.teams.find((t) => t.team_label === 'TEAM_B')
  if (!teamA || !teamB) return null

  const teamAPlayerIds = match.participants.filter((p) => p.team_id === teamA.id).map((p) => p.player_id)
  const inputTeamAIsTeamA = teamAIds.some((id) => teamAPlayerIds.includes(id))

  const myTeam = inputTeamAIsTeamA ? teamA : teamB
  const oppTeam = inputTeamAIsTeamA ? teamB : teamA

  const myPlayers = match.participants
    .filter((p) => p.team_id === myTeam.id)
    .map((p) => formatShortPlayerName(p.player.name))
  const oppPlayers = match.participants
    .filter((p) => p.team_id === oppTeam.id)
    .map((p) => formatShortPlayerName(p.player.name))

  const scoreStr = match.scores
    .map((s) => {
      const my = inputTeamAIsTeamA ? s.team_a_score : s.team_b_score
      const opp = inputTeamAIsTeamA ? s.team_b_score : s.team_a_score
      return `${my}–${opp}`
    })
    .join(', ') || '—'

  return {
    isWin: !!myTeam.is_winner,
    myPlayers: myPlayers.join(' & '),
    oppPlayers: oppPlayers.join(' & '),
    scoreStr,
    type: MATCH_TYPE_SHORT[match.match_type] ?? '—',
  }
}

// ── Win Gauge (half-circle SVG) ───────────────────────────────────────────────

function WinGauge({
  winRate,
  hasData,
}: {
  winRate: number | null
  hasData: boolean
}) {
  const { t } = useI18n()
  const R = 40
  const cx = 52
  const cy = 52
  const circumference = Math.PI * R

  const filled = winRate !== null ? Math.round(winRate * circumference) : 0
  const gap = circumference - filled
  const pathD = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 4 }}>
      {/* Gauge — fills the column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <svg width="100%" viewBox="0 0 104 56" style={{ overflow: 'visible' }}>
          <path
            d={pathD}
            fill="none"
            stroke="color-mix(in oklch, var(--muted) 30%, var(--bg))"
            strokeWidth={8}
            strokeLinecap="round"
          />
          {winRate !== null && winRate > 0 && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${filled} ${gap}`}
            />
          )}
          {/* Percentage in center */}
          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, fill: hasData ? 'var(--accent)' : 'var(--muted)' }}
          >
            {hasData && winRate !== null ? `${Math.round(winRate * 100)}%` : '—'}
          </text>
          <text
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, fill: 'var(--muted)', letterSpacing: 1 }}
          >
            {t('ranking.h2hWins')}
          </text>
        </svg>
      </div>
    </div>
  )
}

// ── Player slot ───────────────────────────────────────────────────────────────

function PlayerSlot({
  player,
  side,
  onRemove,
  onPick,
}: {
  player: Player | null
  side: 'A' | 'B'
  onRemove: () => void
  onPick: () => void
}) {
  const { t } = useI18n()
  const isRight = side === 'B'

  if (player) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexDirection: isRight ? 'row-reverse' : 'row',
          gap: 8,
          padding: '10px 0',
          borderBottom: '1px solid var(--border)',
          position: 'relative',
          cursor: 'pointer',
        }}
        onClick={onPick}
        className="active:opacity-70"
      >
        {/* Avatar with × badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar src={player.avatar_url} name={player.name} size={44} />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            style={{
              position: 'absolute',
              top: -3,
              ...(isRight ? { right: -3 } : { left: -3 }),
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'var(--muted)',
              border: '2px solid var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              zIndex: 2,
            }}
          >
            <X size={7} color="var(--bg)" strokeWidth={3} />
          </button>
        </div>

        <div style={{ minWidth: 0, flex: 1, textAlign: isRight ? 'right' : 'left' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.3,
              color: 'var(--fg)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {formatShortPlayerName(player.name)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        display: 'flex',
        alignItems: 'center',
        flexDirection: isRight ? 'row-reverse' : 'row',
        gap: 8,
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
        width: '100%',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
      className="active:opacity-60"
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'color-mix(in oklch, var(--muted) 20%, var(--bg))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Plus size={16} color="var(--muted)" />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          lineHeight: 1.3,
          textAlign: isRight ? 'right' : 'left',
        }}
      >
        {t('ranking.h2hChoosePair')}
      </div>
    </button>
  )
}

// ── Player picker bottom sheet ────────────────────────────────────────────────

function PlayerPicker({
  open,
  onClose,
  players,
  disabledIds,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  players: Player[]
  disabledIds: string[]
  onSelect: (player: Player) => void
}) {
  const { t } = useI18n()

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'oklch(0% 0 0 / 0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          width: '100%',
          maxWidth: 512,
          zIndex: 101,
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          padding: 'var(--space-3) var(--space-3) max(var(--space-5), calc(env(safe-area-inset-bottom) + var(--space-4)))',
          boxShadow: '0 -4px 32px oklch(0% 0 0 / 0.12)',
          transform: open ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(110%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0, 0.15, 1)',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: 'var(--border)',
            borderRadius: 2,
            margin: '0 auto var(--space-4)',
            flexShrink: 0,
          }}
        />
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 800,
            color: 'var(--fg)',
            marginBottom: 'var(--space-3)',
            padding: '0 var(--space-2)',
            flexShrink: 0,
          }}
        >
          {t('ranking.h2hSelectTeam')}
        </p>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {players.map((player) => {
            const isDisabled = disabledIds.includes(player.id)
            return (
              <button
                key={player.id}
                type="button"
                disabled={isDisabled}
                onClick={() => { onSelect(player); onClose() }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '10px var(--space-2)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: isDisabled ? 'default' : 'pointer',
                  opacity: isDisabled ? 0.35 : 1,
                  WebkitTapHighlightColor: 'transparent',
                  textAlign: 'left',
                }}
                className={isDisabled ? '' : 'active:opacity-60'}
              >
                <Avatar src={player.avatar_url} name={player.name} size={36} />
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--fg)',
                  }}
                >
                  {player.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Match history row ─────────────────────────────────────────────────────────

function MatchHistoryRow({ match, teamAIds }: { match: MatchWithDetails; teamAIds: string[] }) {
  const row = getH2HRow(match, teamAIds)
  if (!row) return null

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <Badge variant={row.isWin ? 'win' : 'loss'}>
        {row.isWin ? 'W' : 'L'}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] truncate" style={{ color: 'var(--fg)' }}>
          {row.myPlayers} vs {row.oppPlayers}
        </p>
        <p className="text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
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
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HeadToHeadTab() {
  const { t } = useI18n()
  const { data: allPlayers = [] } = usePlayers()

  const [teamA, setTeamA] = useState<(Player | null)[]>([null, null])
  const [teamB, setTeamB] = useState<(Player | null)[]>([null, null])
  const [picker, setPicker] = useState<{ side: 'A' | 'B'; slot: 0 | 1 } | null>(null)

  const teamAIds = useMemo(() => teamA.filter(Boolean).map((p) => p!.id), [teamA])
  const teamBIds = useMemo(() => teamB.filter(Boolean).map((p) => p!.id), [teamB])

  const { teamAWins, teamBWins, totalMatches, matches, isLoading } = useH2HPairs(teamAIds, teamBIds)

  const hasEnoughPlayers = teamAIds.length > 0 && teamBIds.length > 0
  const teamAWinRate = hasEnoughPlayers && totalMatches > 0 ? teamAWins / totalMatches : null

  const allSelectedIds = [...teamAIds, ...teamBIds]

  function handlePick(player: Player) {
    if (!picker) return
    if (picker.side === 'A') {
      setTeamA((prev) => {
        const next = [...prev]
        next[picker.slot] = player
        return next
      })
    } else {
      setTeamB((prev) => {
        const next = [...prev]
        next[picker.slot] = player
        return next
      })
    }
  }

  function removePlayer(side: 'A' | 'B', slot: 0 | 1) {
    if (side === 'A') setTeamA((prev) => { const next = [...prev]; next[slot] = null; return next })
    else setTeamB((prev) => { const next = [...prev]; next[slot] = null; return next })
  }

  return (
    <div style={{ margin: '0 var(--space-5)' }}>
      {/* Comparison header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 30% 1fr',
          gap: 0,
          marginBottom: 'var(--space-5)',
          paddingBottom: 'var(--space-5)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Team A slots */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {([0, 1] as const).map((slot) => (
            <PlayerSlot
              key={slot}
              player={teamA[slot]}
              side="A"
              onRemove={() => removePlayer('A', slot)}
              onPick={() => setPicker({ side: 'A', slot })}
            />
          ))}
          {hasEnoughPlayers && totalMatches > 0 && (
            <div style={{ paddingTop: 6, textAlign: 'left' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                {teamAWins}
              </span>
            </div>
          )}
        </div>

        {/* Center: gauge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WinGauge
            winRate={teamAWinRate}
            hasData={hasEnoughPlayers && totalMatches > 0}
          />
        </div>

        {/* Team B slots */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {([0, 1] as const).map((slot) => (
            <PlayerSlot
              key={slot}
              player={teamB[slot]}
              side="B"
              onRemove={() => removePlayer('B', slot)}
              onPick={() => setPicker({ side: 'B', slot })}
            />
          ))}
          {hasEnoughPlayers && totalMatches > 0 && (
            <div style={{ paddingTop: 6, textAlign: 'right' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                {teamBWins}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats + history */}
      {hasEnoughPlayers && (
        isLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
            {t('common.loadingEllipsis')}
          </div>
        ) : totalMatches === 0 ? (
          <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--muted)', padding: '32px 0' }}>
            {t('ranking.h2hNoData')}
          </p>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-3)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--muted)',
                }}
              >
                {t('ranking.h2hHistory')}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--muted)',
                }}
              >
                {t('ranking.h2hTotalMatches', { count: totalMatches })}
              </span>
            </div>
            <div
              className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
              style={{ borderRadius: 'var(--radius-lg)' }}
            >
              {matches.map((match) => (
                <MatchHistoryRow
                  key={match.id}
                  match={match}
                  teamAIds={teamAIds}
                />
              ))}
            </div>
          </>
        )
      )}

      <PlayerPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        players={allPlayers}
        disabledIds={allSelectedIds}
        onSelect={handlePick}
      />
    </div>
  )
}
