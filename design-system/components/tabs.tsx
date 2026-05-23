import { useRef, useEffect, useState } from 'react'

export interface TabsProps {
  tabs: string[]
  activeTab: string
  onTabChange: (tab: string) => void
  className?: string
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
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          ref={tab === activeTab ? activeRef : undefined}
          onClick={() => onTabChange(tab)}
          className={`px-3 py-2 text-[13px] font-semibold transition-colors duration-[var(--duration-fast)] select-none cursor-pointer`}
          style={{
            color: tab === activeTab ? 'var(--fg)' : 'var(--muted)',
            fontFamily: 'var(--font-body)',
            border: 'none',
            background: 'transparent',
            touchAction: 'manipulation',
          }}
        >
          {tab}
        </button>
      ))}
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
