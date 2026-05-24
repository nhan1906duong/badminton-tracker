import { Badge } from './badge'
import { Avatar } from './avatar'
import { useI18n } from '../../src/i18n'

interface SessionCardProps {
  status: 'active' | 'scheduled' | 'completed'
  name: string
  dateTime: string
  duration: string
  matchCount: number
  topPlayer?: {
    name: string
    record: string
    winRate: number
  }
  compact?: boolean
}

export function SessionCard({
  status,
  name,
  dateTime,
  duration,
  matchCount,
  topPlayer,
  compact,
}: SessionCardProps) {
  const { t } = useI18n()
  const isOpen = status !== 'completed'
  const isActive = status === 'active'
  const isScheduled = status === 'scheduled'

  return (
    <div
      className={`bg-[var(--surface)] ${compact ? 'p-4' : 'p-5'}`}
      style={{
        border: isOpen ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div
            className={`font-extrabold leading-[1.15] tracking-[-0.01em] ${compact ? 'text-[18px]' : 'text-[24px]'}`}
            style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
          >
            {name}
          </div>
          <div
            className={`mt-1 font-mono ${compact ? 'text-[11px]' : 'text-[13px]'}`}
            style={{ color: 'var(--muted)' }}
          >
            {dateTime}
          </div>
        </div>
        {isActive ? (
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: 'var(--accent)' }}
            />
            <Badge variant="accent">{t('common.live')}</Badge>
          </div>
        ) : isScheduled ? (
          <Badge variant="default" className="shrink-0 whitespace-nowrap bg-transparent border-[var(--fg)] text-[var(--fg)]">
            {t('common.scheduled')}
          </Badge>
        ) : (
          <Badge variant="neutral" className="shrink-0 whitespace-nowrap">{t('common.completed')}</Badge>
        )}
      </div>

      {/* Meta row */}
      <div
        className={`flex items-center gap-3 font-mono ${compact ? 'text-[11px] mb-3' : 'text-[13px] mb-5'}`}
        style={{ color: 'var(--muted)' }}
      >
        {isActive ? (
          <>
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--accent)' }}
            />
            <span>{t('sessions.elapsed')}</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--border)' }} />
            <span>{duration}</span>
          </>
        )}
        <span className="w-1 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        <span>
          {t('units.match', { count: matchCount })}
        </span>
      </div>

      {/* Top Player / MVP */}
      <div
        className={`pt-3 ${compact ? 'pt-2' : 'pt-3'}`}
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div
          className="text-[11px] font-bold font-mono uppercase tracking-[0.08em] mb-2"
          style={{ color: 'var(--accent)' }}
        >
          {isActive ? t('sessions.leading') : isScheduled ? t('sessions.players') : t('sessions.topPlayer')}
        </div>
        {topPlayer ? (
          <div className="flex items-center gap-3">
            <Avatar name={topPlayer.name} size={compact ? 24 : 32} />
            <div className="flex-1 min-w-0">
              <div
                className={`font-semibold leading-[1.2] ${compact ? 'text-[13px]' : 'text-[15px]'}`}
                style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
              >
                {topPlayer.name}
              </div>
              <div
                className={`font-mono ${compact ? 'text-[10px]' : 'text-[11px]'}`}
                style={{ color: 'var(--muted)' }}
              >
                {topPlayer.record}
              </div>
            </div>
            <div className="text-right">
              <div
                className={`font-extrabold leading-none ${compact ? 'text-[13px]' : 'text-[15px]'}`}
                style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}
              >
                {topPlayer.winRate}%
              </div>
              <div
                className={`font-mono uppercase tracking-[0.06em] ${compact ? 'text-[10px]' : 'text-[11px]'}`}
                style={{ color: 'var(--muted)' }}
              >
                {t('sessions.winRate')}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
            {isScheduled ? t('sessions.notStartedYet') : t('sessions.noMatchesStarted')}
          </div>
        )}
      </div>
    </div>
  )
}
