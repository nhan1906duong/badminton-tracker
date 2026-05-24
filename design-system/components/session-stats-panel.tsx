import { Activity } from 'lucide-react'
import { Avatar } from './avatar'
import { useI18n } from '../../src/i18n'

export interface SessionStatsPanelProps {
  matchCount: number
  playerCount: number
  /** First name of the leading / MVP player. Undefined = not enough data. */
  mvpName?: string
  /** Sublabel shown under the name, e.g. "Leading · 75%" or "MVP · 83%". */
  mvpLabel?: string
  /** Avatar URL for the leading / MVP player. */
  mvpAvatarUrl?: string | null
  /** Right-side meta text in the footer row. */
  footerMeta?: string
  onPress?: () => void
}

export function SessionStatsPanel({
  matchCount,
  playerCount,
  mvpName,
  mvpLabel,
  mvpAvatarUrl,
  footerMeta,
  onPress,
}: SessionStatsPanelProps) {
  const { t } = useI18n()
  const resolvedFooterMeta = footerMeta ?? `${t('sessionStats.ranking')} · ${t('sessions.winRate')} · ${t('sessionStats.streaks')}`

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full text-left overflow-hidden active:bg-[var(--bg)] transition-colors duration-[var(--duration-normal)]"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        cursor: onPress ? 'pointer' : 'default',
        touchAction: 'manipulation',
      }}
    >
      {/* Three stat cells */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <StatCell value={String(matchCount)} label={t('sessionDetail.matches')} />
        <StatCell value={String(playerCount)} label={t('sessions.players')} divider />
        <StatCell
          value={mvpName ?? '—'}
          label={mvpLabel ?? '—'}
          accent={!!mvpName}
          mvp
          divider
          avatarUrl={mvpName ? mvpAvatarUrl : undefined}
          avatarName={mvpName}
        />
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderTop: '1px solid var(--border)',
          background: 'color-mix(in oklch, var(--bg) 50%, transparent)',
        }}
      >
        <span
          className="inline-flex items-center gap-[var(--space-2)]"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--accent)',
          }}
        >
          <Activity size={14} aria-hidden="true" />
          {t('sessionDetail.viewPlayerStats')}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--muted)',
          }}
        >
          {resolvedFooterMeta}
        </span>
      </div>
    </button>
  )
}

// ── Internal cell ──────────────────────────────────────────────────────────

interface StatCellProps {
  value: string
  label: string
  accent?: boolean
  mvp?: boolean
  divider?: boolean
  avatarUrl?: string | null
  avatarName?: string
}

function StatCell({ value, label, accent = false, mvp = false, divider = false, avatarUrl, avatarName }: StatCellProps) {
  const showAvatar = mvp && avatarName && value !== '—'
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        padding: 'var(--space-4) var(--space-3)',
        gap: 4,
        borderLeft: divider ? '1px solid var(--border)' : undefined,
        minWidth: 0,
      }}
    >
      {/* Primary value — avatar+name row for MVP, number for others */}
      {showAvatar ? (
        <div
          className="flex items-center"
          style={{ gap: 'var(--space-2)', minWidth: 0, maxWidth: '100%' }}
        >
          <Avatar src={avatarUrl} name={avatarName} size={24} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: 'var(--accent)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value}
          </span>
        </div>
      ) : (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontFeatureSettings: '"tnum" 1',
            color: 'var(--fg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          {value}
        </span>
      )}

      {/* Label */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: accent ? 'var(--accent)' : 'var(--muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}
      >
        {label}
      </span>
    </div>
  )
}
