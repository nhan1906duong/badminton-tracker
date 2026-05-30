import type { TeamStanding } from '../types/database'
import { useI18n } from '../i18n'
import { Crown } from 'lucide-react'

interface LeagueStandingsTableProps {
  standings: TeamStanding[]
  isEnded?: boolean
}

export default function LeagueStandingsTable({ standings, isEnded }: LeagueStandingsTableProps) {
  const { t } = useI18n()

  if (!standings || standings.length === 0) return null

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg)] border-b border-[var(--border)]">
        <span
          className="font-[family:var(--font-mono)] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"
          style={{ fontSize: 11 }}
        >
          {t('sessionDetail.standings')}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontSize: 14 }}>
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-3 py-2 text-left font-[family:var(--font-mono)] text-[var(--muted)] font-bold uppercase tracking-[0.08em]" style={{ fontSize: 10, width: 32 }}>#</th>
              <th className="px-3 py-2 text-left font-[family:var(--font-mono)] text-[var(--muted)] font-bold uppercase tracking-[0.08em]" style={{ fontSize: 10 }}>{t('sessionDetail.team')}</th>
              <th className="px-3 py-2 text-center font-[family:var(--font-mono)] text-[var(--muted)] font-bold uppercase tracking-[0.08em]" style={{ fontSize: 10, width: 40 }}>{t('sessionDetail.played')}</th>
              <th className="px-3 py-2 text-center font-[family:var(--font-mono)] text-[var(--muted)] font-bold uppercase tracking-[0.08em]" style={{ fontSize: 10, width: 32 }}>{t('sessionDetail.w')}</th>
              <th className="px-3 py-2 text-center font-[family:var(--font-mono)] text-[var(--muted)] font-bold uppercase tracking-[0.08em]" style={{ fontSize: 10, width: 32 }}>{t('sessionDetail.l')}</th>
              <th className="px-3 py-2 text-center font-[family:var(--font-mono)] text-[var(--muted)] font-bold uppercase tracking-[0.08em]" style={{ fontSize: 10, width: 40 }}>{t('sessionDetail.pts')}</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const isChampion = isEnded && i === 0
              return (
                <tr
                  key={s.teamId}
                  className={`border-b border-[var(--border)] last:border-b-0 ${isChampion ? 'bg-[var(--accent-soft)]' : ''}`}
                >
                  <td className="px-3 py-3">
                    <span className="font-[family:var(--font-display)] font-bold text-[var(--fg)]" style={{ fontSize: 15 }}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-[family:var(--font-display)] font-bold text-[var(--fg)] truncate" style={{ fontSize: 15 }}>
                        {s.teamName}
                      </span>
                      {isChampion && (
                        <Crown className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-[family:var(--font-mono)] text-[var(--fg)]" style={{ fontSize: 14 }}>
                    {s.played}
                  </td>
                  <td className="px-3 py-3 text-center font-[family:var(--font-mono)] text-[var(--accent)] font-bold" style={{ fontSize: 14 }}>
                    {s.wins}
                  </td>
                  <td className="px-3 py-3 text-center font-[family:var(--font-mono)] text-[var(--danger)]" style={{ fontSize: 14 }}>
                    {s.losses}
                  </td>
                  <td className="px-3 py-3 text-center font-[family:var(--font-display)] font-black text-[var(--accent)]" style={{ fontSize: 16 }}>
                    {s.points}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
