import { useState } from 'react'
import { Shuffle } from 'lucide-react'
import { BottomSheet } from '../../../design-system/components/bottom-sheet'
import { formatShortPlayerName } from '../../lib/player-name'
import { useI18n } from '../../i18n'
import { generateNextMatch, makeSplitKey } from '../../lib/fair-shuffle'
import type { ShufflePlayer, ShuffleMatch } from '../../lib/fair-shuffle'
import type { MatchWithDetails, Player } from '../../types/database'

function buildSessionHistory(
  sessionMatches: MatchWithDetails[],
  pool: ShufflePlayer[]
): {
  playedSplits: Set<string>
  recentMatchHistory: ShuffleMatch[]
} {
  const playedSplits = new Set<string>()
  const recentMatchHistory: ShuffleMatch[] = []

  const poolIds = new Set(pool.map(p => p.id))

  const sorted = [...sessionMatches]
    .filter(m => m.status === 'COMPLETED')
    .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())

  for (const match of sorted) {
    const teamADef = match.teams.find(t => t.team_label === 'TEAM_A')
    const teamBDef = match.teams.find(t => t.team_label === 'TEAM_B')
    if (!teamADef || !teamBDef) continue

    const teamAIds = match.participants.filter(p => p.team_id === teamADef.id).map(p => p.player_id)
    const teamBIds = match.participants.filter(p => p.team_id === teamBDef.id).map(p => p.player_id)

    if (teamAIds.length !== 2 || teamBIds.length !== 2) continue
    if ([...teamAIds, ...teamBIds].some(id => !poolIds.has(id))) continue

    playedSplits.add(makeSplitKey(teamAIds, teamBIds))

    const t1 = teamAIds.map(id => pool.find(p => p.id === id)!).filter(Boolean) as [ShufflePlayer, ShufflePlayer]
    const t2 = teamBIds.map(id => pool.find(p => p.id === id)!).filter(Boolean) as [ShufflePlayer, ShufflePlayer]
    recentMatchHistory.push({ team1: t1, team2: t2, resting: [] })
    if (recentMatchHistory.length > 2) recentMatchHistory.shift()
  }

  return { playedSplits, recentMatchHistory }
}

export interface ShuffleResult {
  teamA: string[]
  teamB: string[]
}

interface ShufflePickerSheetProps {
  open: boolean
  onClose: () => void
  availablePlayers?: Player[]
  matches?: MatchWithDetails[]
  teamSize: number
  onResult: (result: ShuffleResult) => void
}

export function ShufflePickerSheet({
  open,
  onClose,
  availablePlayers,
  matches,
  teamSize,
  onResult,
}: ShufflePickerSheetProps) {
  const { t } = useI18n()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastShuffleKey, setLastShuffleKey] = useState<string | null>(null)

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (!availablePlayers) return
    const allSelected = availablePlayers.every(p => selectedIds.has(p.id))
    setSelectedIds(allSelected ? new Set() : new Set(availablePlayers.map(p => p.id)))
  }

  function performShuffle() {
    if (!availablePlayers) return
    const pool: ShufflePlayer[] = availablePlayers
      .filter(p => selectedIds.has(p.id))
      .map(p => ({ id: p.id, name: p.name }))
    if (pool.length < teamSize * 2) return

    if (teamSize === 2) {
      const { playedSplits, recentMatchHistory } = buildSessionHistory(matches ?? [], pool)
      const result = generateNextMatch({ selectedPlayers: pool, playedSplits, recentMatchHistory, lastPickKey: lastShuffleKey ?? undefined })
      setLastShuffleKey(makeSplitKey([result.team1[0].id, result.team1[1].id], [result.team2[0].id, result.team2[1].id]))
      onResult({
        teamA: [result.team1[0].id, result.team1[1].id],
        teamB: [result.team2[0].id, result.team2[1].id],
      })
    } else {
      const shuffled = [...pool]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      onResult({ teamA: [shuffled[0].id], teamB: [shuffled[1].id] })
    }
    onClose()
  }

  const selCount = selectedIds.size
  const needed = teamSize * 2
  const disabled = selCount < needed

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* Header */}
      <div style={{ padding: '0 var(--space-5) var(--space-3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ marginBottom: 'var(--space-1)' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}>
              {t('shuffle.title')}
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
            {selCount === 0
              ? t('shuffle.selectPlayers')
              : t('shuffle.selectedCount', { count: selCount })}
          </p>
        </div>
        <button
          type="button"
          onClick={selectAll}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            color: 'var(--accent)',
            padding: 'var(--space-1) 0',
            touchAction: 'manipulation',
            flexShrink: 0,
          }}
        >
          {availablePlayers && availablePlayers.every(p => selectedIds.has(p.id))
            ? t('shuffle.clearAll')
            : t('shuffle.selectAll')}
        </button>
      </div>

      {/* Player list */}
      <div style={{ overflowY: 'auto', maxHeight: '45vh', padding: '0 var(--space-5)' }}>
        {availablePlayers?.map(p => {
          const isSel = selectedIds.has(p.id)
          return (
            <button
              key={p.id}
              type="button"
              role="checkbox"
              aria-checked={isSel}
              onClick={() => toggle(p.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) 0',
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                textAlign: 'left',
                touchAction: 'manipulation',
                minHeight: 44,
              }}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                border: `2px solid ${isSel ? 'var(--accent)' : 'var(--muted)'}`,
                background: isSel ? 'var(--accent)' : 'transparent',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                transition: 'background 0.12s, border-color 0.12s',
              }}>
                {isSel && (
                  <svg width="12" height="12" fill="none" viewBox="0 0 12 12" stroke="white" strokeWidth={2.5}>
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-base)',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--fg)',
              }}>
                {formatShortPlayerName(p.name)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Shuffle CTA */}
      <div style={{ padding: 'var(--space-4) var(--space-5) 0' }}>
        <button
          type="button"
          onClick={performShuffle}
          disabled={disabled}
          style={{
            width: '100%',
            padding: 'var(--space-3) var(--space-2)',
            background: 'var(--accent)',
            color: 'var(--surface)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            border: '2px solid var(--accent)',
            borderRadius: 'var(--radius-sm)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            minHeight: 52,
            touchAction: 'manipulation',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            opacity: disabled ? 0.35 : 1,
          }}
        >
          <Shuffle style={{ width: 15, height: 15 }} />
          {selCount >= needed
            ? t('shuffle.selectedButton', { count: selCount })
            : t('shuffle.needMore', { count: needed - selCount })}
        </button>
      </div>
    </BottomSheet>
  )
}
