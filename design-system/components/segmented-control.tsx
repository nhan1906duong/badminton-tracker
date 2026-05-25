import type { ReactNode } from 'react'

export interface SegmentedTab<T extends string = string> {
  id: T
  label: string
  icon?: ReactNode
}

export interface SegmentedControlProps<T extends string = string> {
  tabs: SegmentedTab<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
}

export function SegmentedControl<T extends string = string>({
  tabs,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="segmented-scroll"
      style={{
        display: 'flex',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 3,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className="shrink-0"
            style={{
              position: 'relative',
              zIndex: 1,
              background: active ? 'var(--fg)' : 'transparent',
              border: 'none',
              padding: 'var(--space-3) var(--space-3)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: active ? 'var(--surface)' : 'var(--muted)',
              cursor: 'pointer',
              minHeight: 40,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-1)',
              transition: 'color 0.2s, background 0.2s',
              letterSpacing: '-0.005em',
              touchAction: 'manipulation',
              whiteSpace: 'nowrap',
              borderRadius: 6,
            }}
          >
            {tab.icon && (
              <span style={{ display: 'inline-flex', flexShrink: 0, width: 13, height: 13 }}>
                {tab.icon}
              </span>
            )}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
