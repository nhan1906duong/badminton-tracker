import type { ReactNode } from 'react'

export type EyebrowTone = 'live' | 'scheduled' | 'completed' | 'neutral'

export interface EyebrowBadgeProps {
  tone?: EyebrowTone
  /** Show a pulsing dot before the label (typically for the `live` tone) */
  pulse?: boolean
  children: ReactNode
  className?: string
}

const TONE_COLOR: Record<EyebrowTone, string> = {
  live: 'var(--accent)',
  scheduled: 'var(--fg)',
  completed: 'var(--muted)',
  neutral: 'var(--muted)',
}

/**
 * Mono uppercase status eyebrow rendered above a title (e.g. LIVE / SCHEDULED / COMPLETED).
 * Replaces the colored mono-uppercase eyebrow rows in session and match heroes.
 */
export function EyebrowBadge({
  tone = 'neutral',
  pulse = false,
  children,
  className = '',
}: EyebrowBadgeProps) {
  const color = TONE_COLOR[tone]
  return (
    <div
      className={`inline-flex items-center gap-[var(--space-2)] ${className}`}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color,
        minHeight: 18,
      }}
    >
      {pulse && (
        <span
          className="rounded-full animate-pulse flex-shrink-0"
          style={{ width: 8, height: 8, background: color }}
        />
      )}
      <span>{children}</span>
    </div>
  )
}
