import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../i18n'
import type { MatchWithDetails, Player } from '../types/database'
import Avatar from './Avatar'
import { PlayerMatchHistoryItem } from './PlayerMatchHistoryItem'
import PlayerRecordLine from './PlayerRecordLine'

export interface VersusEntry {
  person: Player
  wins: number
  losses: number
  totalMatches: number
  matches: MatchWithDetails[]
}

interface Props {
  entries: VersusEntry[]
  playerId: string
  isLoading: boolean
  countLabel: string
}

export function PlayerVersusList({ entries, playerId, isLoading, countLabel }: Props) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--border)' }} />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div
        className="bg-[var(--bg)] border border-[var(--border)] p-4"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {t('players.noDoublesYet')}
        </p>
      </div>
    )
  }

  return (
    <>
      <div
        className="text-[11px] font-bold uppercase tracking-[0.1em] px-1"
        style={{ color: 'var(--muted)' }}
      >
        {countLabel}
      </div>
      {entries.map(entry => {
        const isExpanded = expanded.has(entry.person.id)
        const winRate = Math.round(
          entry.totalMatches > 0 ? (entry.wins / entry.totalMatches) * 100 : 0,
        )
        return (
          <div
            key={entry.person.id}
            className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
            style={{ borderRadius: 'var(--radius-lg)' }}
          >
            <button
              onClick={() =>
                setExpanded(prev => {
                  const next = new Set(prev)
                  if (next.has(entry.person.id)) next.delete(entry.person.id)
                  else next.add(entry.person.id)
                  return next
                })
              }
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-[var(--bg)]"
            >
              <Avatar src={entry.person.avatar_url} name={entry.person.name} size={32} />
              <div className="flex-1 min-w-0 text-left">
                <p
                  className="text-[15px] font-semibold truncate"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
                >
                  {entry.person.name}
                </p>
                <PlayerRecordLine
                  matchesPlayed={entry.totalMatches}
                  wins={entry.wins}
                  losses={entry.losses}
                  winRate={winRate}
                  marginTop={2}
                />
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} />
              )}
            </button>

            {isExpanded && (
              <div
                className="divide-y divide-[var(--border)]"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                {entry.matches.map(match => (
                  <PlayerMatchHistoryItem key={match.id} match={match} playerId={playerId} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
