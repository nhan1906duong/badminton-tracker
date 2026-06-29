import { Badge } from '../../design-system/components'
import { useI18n } from '../i18n'
import { getMatchRow } from '../lib/player-match-row'
import type { MatchWithDetails } from '../types/database'

interface Props {
  match: MatchWithDetails
  playerId: string
}

export function PlayerMatchHistoryItem({ match, playerId }: Props) {
  const { t } = useI18n()
  const row = getMatchRow(match, playerId)
  if (!row) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Badge variant={row.isWin ? 'win' : 'loss'}>{row.isWin ? 'W' : 'L'}</Badge>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] truncate" style={{ color: 'var(--fg)' }}>
          {row.teammates
            ? t('players.withOpponent', {
                teammates: row.teammates,
                opponents: row.opponents || '—',
              })
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
}
