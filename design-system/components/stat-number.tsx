import type { ReactNode } from 'react'

export type StatNumberSize = 'lg' | 'xl' | '2xl'
export type StatNumberColor = 'fg' | 'accent' | 'muted'

export interface StatNumberProps {
  value: ReactNode
  size?: StatNumberSize
  color?: StatNumberColor
  className?: string
}

const SIZE_TOKEN: Record<StatNumberSize, string> = {
  lg: 'var(--text-lg)',
  xl: 'var(--text-xl)',
  '2xl': 'var(--text-2xl)',
}

const COLOR_TOKEN: Record<StatNumberColor, string> = {
  fg: 'var(--fg)',
  accent: 'var(--accent)',
  muted: 'var(--muted)',
}

/**
 * Large display numeral with tabular figures.
 * Replaces the `var(--font-display)` 800-weight tabular-nums value seen in
 * ranking rows, the MVP card, and the session-stats panel.
 */
export function StatNumber({
  value,
  size = 'xl',
  color = 'fg',
  className = '',
}: StatNumberProps) {
  return (
    <span
      className={className}
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: SIZE_TOKEN[size],
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
        color: COLOR_TOKEN[color],
      }}
    >
      {value}
    </span>
  )
}
