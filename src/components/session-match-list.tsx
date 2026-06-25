import { usePlayerMatchesBySession } from '../hooks/usePlayerMatchesBySession'
import { PlayerMatchHistoryItem } from './PlayerMatchHistoryItem'
import { useI18n } from '../i18n'

interface Props {
  playerId: string
  sessionId: string
}

export function SessionMatchList({ playerId, sessionId }: Props) {
  const { t } = useI18n()
  const { data: matches, isLoading } = usePlayerMatchesBySession(playerId, sessionId)

  if (isLoading) {
    return (
      <div className="px-4 py-3 space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-10 rounded animate-pulse"
            style={{ background: 'var(--border)' }}
          />
        ))}
      </div>
    )
  }

  const withWinner = (matches ?? []).filter((m) => m.teams.some((t) => t.is_winner))

  if (withWinner.length === 0) {
    return (
      <div className="px-4 py-3">
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {t('players.noCompletedMatches')}
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {withWinner.map((match) => (
        <PlayerMatchHistoryItem key={match.id} match={match} playerId={playerId} />
      ))}
    </div>
  )
}
