import { useBestPartner } from '../hooks/useBestPartner'
import { PlayerVersusList } from './PlayerVersusList'
import { useI18n } from '../i18n'

interface Props {
  playerId: string
}

export function PlayerPartnersContent({ playerId }: Props) {
  const { t } = useI18n()
  const { allPartners, isLoading } = useBestPartner(playerId)

  const versusEntries = allPartners.map((entry) => ({
    person: entry.partner,
    wins: entry.wins,
    losses: entry.totalMatches - entry.wins,
    totalMatches: entry.totalMatches,
    matches: entry.matches,
  }))

  return (
    <PlayerVersusList
      entries={versusEntries}
      playerId={playerId}
      isLoading={isLoading}
      countLabel={t('players.partnersCount', { count: allPartners.length })}
    />
  )
}
