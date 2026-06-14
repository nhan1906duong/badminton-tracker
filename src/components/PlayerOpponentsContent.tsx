import { useOpponents } from '../hooks/useOpponents'
import { PlayerVersusList } from './PlayerVersusList'
import { useI18n } from '../i18n'

interface Props {
  playerId: string
}

export function PlayerOpponentsContent({ playerId }: Props) {
  const { t } = useI18n()
  const { entries, isLoading } = useOpponents(playerId)

  const versusEntries = entries.map((entry) => ({
    person: entry.opponent,
    wins: entry.wins,
    losses: entry.losses,
    totalMatches: entry.totalMatches,
    matches: entry.matches,
  }))

  return (
    <PlayerVersusList
      entries={versusEntries}
      playerId={playerId}
      isLoading={isLoading}
      countLabel={t('players.opponentsCount', { count: entries.length })}
    />
  )
}
