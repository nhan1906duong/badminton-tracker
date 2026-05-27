import type { CSSProperties, ReactNode } from 'react'
import { useI18n } from '../i18n'

interface PlayerRecordLineProps {
  matchesPlayed: number
  wins: number
  losses: number
  winRate: number
  fontSize?: CSSProperties['fontSize']
  marginTop?: CSSProperties['marginTop']
  showMatches?: boolean
  extra?: ReactNode
}

export default function PlayerRecordLine({
  matchesPlayed,
  wins,
  losses,
  winRate,
  fontSize = 11,
  marginTop = 4,
  showMatches = true,
  extra,
}: PlayerRecordLineProps) {
  const { t } = useI18n()
  const separator = <span style={{ color: 'var(--border)' }}>·</span>

  return (
    <div
      className="font-mono"
      style={{
        color: 'var(--muted)',
        marginTop,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        fontSize,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {showMatches && (
        <>
          <span>{t('units.match', { count: matchesPlayed })}</span>
          {separator}
        </>
      )}
      <span>{wins}W {losses}L</span>
      {separator}
      <span>{winRate}%</span>
      {extra && (
        <>
          {separator}
          <span>{extra}</span>
        </>
      )}
    </div>
  )
}
