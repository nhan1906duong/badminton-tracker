import { Plus, X, ChevronRight, Shuffle } from 'lucide-react'
import { Avatar, SectionLabel } from '../../../design-system/components'
import { formatShortPlayerName } from '../../lib/player-name'
import { useI18n } from '../../i18n'
import type { MatchType, Player } from '../../types/database'

// ── Single slot row ──────────────────────────────────────────────────────────

interface PlayerSlotProps {
  role: string
  player: Player | null | undefined
  isFirst: boolean
  onTap: () => void
  onClear: () => void
}

function PlayerSlot({ role, player, isFirst, onTap, onClear }: PlayerSlotProps) {
  const { t } = useI18n()

  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--surface)',
        border: 'none',
        borderTop: isFirst ? 'none' : '1px solid var(--border)',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: 'var(--fg)',
        minHeight: 60,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Avatar */}
      {player ? (
        <Avatar src={player.avatar_url} name={player.name} size={36} />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg)',
            border: '1.5px dashed var(--border)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            color: 'var(--muted)',
          }}
        >
          <Plus style={{ width: 16, height: 16 }} />
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          marginBottom: 2,
        }}>
          {role}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-base)',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: player ? 'var(--fg)' : 'var(--muted)',
        }}>
          {player ? formatShortPlayerName(player.name) : t('team.tapToAdd')}
        </div>
      </div>

      {/* Right action */}
      {player ? (
        <button
          type="button"
          aria-label={t('team.removePlayer', { name: player.name })}
          onClick={(e) => { e.stopPropagation(); onClear() }}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--bg)',
            border: 'none',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)',
            cursor: 'pointer',
            flexShrink: 0,
            touchAction: 'manipulation',
          }}
        >
          <X style={{ width: 12, height: 12 }} />
        </button>
      ) : (
        <ChevronRight style={{ width: 16, height: 16, color: 'var(--muted)', flexShrink: 0 }} />
      )}
    </button>
  )
}

// ── Players section card ───────────────────────────────────────────────────────

interface PlayerSlotsCardProps {
  matchType: MatchType
  teamSize: number
  teamA: (string | null)[]
  teamB: (string | null)[]
  allPlayers?: Player[]
  onOpenPicker: (team: 'A' | 'B', index: number) => void
  onClearSlot: (team: 'A' | 'B', index: number) => void
  onShuffle?: () => void
}

export function PlayerSlotsCard({
  matchType,
  teamSize,
  teamA,
  teamB,
  allPlayers,
  onOpenPicker,
  onClearSlot,
  onShuffle,
}: PlayerSlotsCardProps) {
  const { t } = useI18n()

  const filledCount = teamA.slice(0, teamSize).filter(Boolean).length + teamB.slice(0, teamSize).filter(Boolean).length
  const totalSlots = teamSize * 2

  function slotRole(index: number): string {
    if (matchType === 'MIXED_DOUBLES') return index === 0 ? t('team.male') : t('team.female')
    if (teamSize === 1) return t('team.player')
    return t('team.playerIndex', { index: index + 1 })
  }

  function teamName(arr: (string | null)[]): string {
    const names = arr.slice(0, teamSize)
      .filter(Boolean)
      .map(id => formatShortPlayerName(allPlayers?.find(p => p.id === id)?.name ?? ''))
    if (!names.length) return t('team.pickPlayerCount', { count: teamSize })
    return names.join(' + ')
  }

  return (
    <section style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-7)' }}>
      <SectionLabel
        className="mb-[var(--space-4)]"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: filledCount === totalSlots ? 'var(--accent)' : 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: filledCount === totalSlots ? 700 : 400,
            }}>
              {t('createMatch.selectedCount', { filled: filledCount, total: totalSlots })}
            </span>
            {teamSize === 2 && onShuffle && (
              <button
                type="button"
                onClick={onShuffle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  color: 'var(--accent)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  padding: '4px 6px',
                  minHeight: 32,
                  touchAction: 'manipulation',
                }}
                aria-label={t('shuffle.ariaLabel')}
              >
                <Shuffle style={{ width: 13, height: 13 }} />
                {t('shuffle.button')}
              </button>
            )}
          </div>
        }
      >
        {t('createMatch.players')}
      </SectionLabel>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {/* Team A header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
        }}>
          <SectionLabel>{t('team.teamA')}</SectionLabel>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--fg)' }}>
            {teamName(teamA)}
          </span>
        </div>

        {/* Team A slots */}
        {Array.from({ length: teamSize }).map((_, i) => (
          <PlayerSlot
            key={`A-${i}`}
            role={slotRole(i)}
            player={allPlayers?.find(p => p.id === teamA[i])}
            isFirst={i === 0}
            onTap={() => onOpenPicker('A', i)}
            onClear={() => onClearSlot('A', i)}
          />
        ))}

        {/* VS divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-2) var(--space-4)',
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--muted)' }}>
            {t('team.VS')}
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Team B header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
        }}>
          <SectionLabel>{t('team.teamB')}</SectionLabel>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--fg)' }}>
            {teamName(teamB)}
          </span>
        </div>

        {/* Team B slots */}
        {Array.from({ length: teamSize }).map((_, i) => (
          <PlayerSlot
            key={`B-${i}`}
            role={slotRole(i)}
            player={allPlayers?.find(p => p.id === teamB[i])}
            isFirst={i === 0}
            onTap={() => onOpenPicker('B', i)}
            onClear={() => onClearSlot('B', i)}
          />
        ))}
      </div>
    </section>
  )
}
