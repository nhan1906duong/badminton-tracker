import { Avatar } from '../../../design-system/components'
import { BottomSheet } from '../../../design-system/components/bottom-sheet'
import { formatShortPlayerName } from '../../lib/player-name'
import { useI18n } from '../../i18n'
import type { Player } from '../../types/database'

interface PlayerPickerSheetProps {
  open: boolean
  onClose: () => void
  title: string
  players: Player[]
  search: string
  onSearchChange: (value: string) => void
  onPick: (playerId: string) => void
}

export function PlayerPickerSheet({
  open,
  onClose,
  title,
  players,
  search,
  onSearchChange,
  onPick,
}: PlayerPickerSheetProps) {
  const { t } = useI18n()

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ padding: '0 var(--space-5) var(--space-3)' }}>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
          }}>
            {title}
          </span>
        </div>
        {/* Search */}
        <input
          type="text"
          placeholder={t('createMatch.searchPlayers')}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          autoComplete="off"
          style={{
            width: '100%',
            padding: 'var(--space-3) var(--space-4)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--fg)',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            outline: 'none',
            minHeight: 44,
          }}
        />
      </div>

      {/* Player list */}
      <div style={{ overflowY: 'auto', padding: `0 var(--space-5) max(var(--space-5), calc(env(safe-area-inset-bottom) + var(--space-4)))` }}>
        {players.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-7) var(--space-4)', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
            {t('createMatch.noPlayerMatches')}
          </div>
        ) : players.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) 0',
              cursor: 'pointer',
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              textAlign: 'left',
              fontFamily: 'inherit',
              color: 'var(--fg)',
              touchAction: 'manipulation',
            }}
          >
            <Avatar src={p.avatar_url} name={p.name} size={36} bgColor="var(--fg)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                {formatShortPlayerName(p.name)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
