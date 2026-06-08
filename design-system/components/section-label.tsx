import type { ReactNode } from 'react'

export interface SectionLabelProps {
  children: ReactNode
  /** Optional right-aligned slot (e.g. a meta value or action button) */
  action?: ReactNode
  className?: string
}

/**
 * Mono uppercase eyebrow used to label a section.
 * Replaces the repeated `var(--font-mono) 11px uppercase tracking-[0.1em] muted` span.
 */
export function SectionLabel({ children, action, className = '' }: SectionLabelProps) {
  const label = (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--muted)',
      }}
    >
      {children}
    </span>
  )

  if (!action) {
    return <div className={className}>{label}</div>
  }

  return (
    <div
      className={`flex items-baseline justify-between ${className}`}
    >
      {label}
      {action}
    </div>
  )
}
