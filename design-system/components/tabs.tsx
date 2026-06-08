import { useRef, useEffect, useState, type ReactNode } from 'react'

export interface TabItem {
  key: string
  label: ReactNode
}

export interface TabsProps {
  tabs: ReadonlyArray<string | TabItem>
  /** The active tab — matches the string for `string[]` tabs, or the `key` for `TabItem[]` tabs. */
  activeTab: string
  /** Fires with the string or the `key` of the tapped tab. */
  onTabChange: (tab: string) => void
  className?: string
}

function normalize(tab: string | TabItem): TabItem {
  return typeof tab === 'string' ? { key: tab, label: tab } : tab
}

export function Tabs({ tabs, activeTab, onTabChange, className = '' }: TabsProps) {
  const activeRef = useRef<HTMLButtonElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  useEffect(() => {
    if (activeRef.current) {
      const el = activeRef.current
      setIndicatorStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      })
    }
  }, [activeTab, tabs])

  return (
    <div
      className={`relative flex gap-2 border-b ${className}`}
      style={{ borderColor: 'var(--border)', paddingBottom: 'var(--space-2)' }}
      role="tablist"
    >
      {tabs.map((rawTab) => {
        const tab = normalize(rawTab)
        const isActive = tab.key === activeTab
        return (
          <button
            key={tab.key}
            ref={isActive ? activeRef : undefined}
            onClick={() => onTabChange(tab.key)}
            role="tab"
            aria-selected={isActive}
            className={`px-3 py-2 text-[13px] font-semibold transition-colors duration-[var(--duration-fast)] select-none cursor-pointer whitespace-nowrap`}
            style={{
              color: isActive ? 'var(--fg)' : 'var(--muted)',
              fontFamily: 'var(--font-body)',
              border: 'none',
              background: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            {tab.label}
          </button>
        )
      })}
      {/* Underline indicator */}
      <div
        className="absolute bottom-0 h-[2px] transition-all duration-[var(--duration-normal)]"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          background: 'var(--fg)',
        }}
      />
    </div>
  )
}
