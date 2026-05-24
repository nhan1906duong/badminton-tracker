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
  const activeIndex = tabs.findIndex((t) => t.id === value)

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 3,
        position: 'relative',
      }}
    >
      {/* Sliding track */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 3,
          bottom: 3,
          width: `calc((100% - 6px) / ${tabs.length})`,
          left: 3,
          background: 'var(--fg)',
          borderRadius: 6,
          transition: 'transform 280ms cubic-bezier(0.32, 0, 0.15, 1)',
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            style={{
              position: 'relative',
              zIndex: 1,
              background: 'transparent',
              border: 'none',
              padding: 'var(--space-3) var(--space-2)',
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
              transition: 'color 0.2s',
              letterSpacing: '-0.005em',
              touchAction: 'manipulation',
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
