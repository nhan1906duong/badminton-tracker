import { Fragment, type ReactNode } from 'react'

export interface MetaItem {
  label: ReactNode
  /** Render in foreground color + medium weight instead of muted */
  emphasis?: boolean
}

export interface MetaRowProps {
  items: MetaItem[]
  className?: string
}

/**
 * Small mono meta line with `·` dot separators (date · duration · count …).
 * Replaces the hand-rolled mono meta rows in session and match heroes.
 */
export function MetaRow({ items, className = '' }: MetaRowProps) {
  return (
    <div
      className={`flex items-center flex-wrap gap-[var(--space-2)] ${className}`}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-sm)',
        color: 'var(--muted)',
      }}
    >
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span style={{ opacity: 0.4 }}>·</span>}
          <span style={item.emphasis ? { color: 'var(--fg)', fontWeight: 600 } : undefined}>
            {item.label}
          </span>
        </Fragment>
      ))}
    </div>
  )
}
