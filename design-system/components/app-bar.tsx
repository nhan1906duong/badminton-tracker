import type { ReactNode } from 'react'

export interface AppBarProps {
  title: string
  leftAction?: {
    label?: string
    icon?: ReactNode
    onClick: () => void
  }
  rightAction?: {
    label?: string
    icon?: ReactNode
    onClick: () => void
  }
  className?: string
  style?: React.CSSProperties
}

export function AppBar({ title, leftAction, rightAction, className = '', style }: AppBarProps) {
  return (
    <nav
      className={`sticky top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 bg-[color-mix(in oklch, var(--bg) 88%, transparent)] backdrop-blur-xl border-b border-transparent ${className}`}
      style={{
        WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        ...style,
      }}
    >
      <div className="flex items-center justify-start min-h-[44px]">
        {leftAction ? (
          <button
            type="button"
            onClick={leftAction.onClick}
            aria-label={leftAction.label ?? 'Back'}
            className="inline-flex items-center gap-2 text-[var(--accent)] font-[family:var(--font-body)] text-[15px] font-medium active:opacity-70 transition-opacity"
          >
            {leftAction.icon ?? null}
            {leftAction.label ? <span>{leftAction.label}</span> : null}
          </button>
        ) : (
          <div />
        )}
      </div>

      <div className="flex items-center justify-center min-h-[44px]">
        <span
          className="font-[family:var(--font-display)] font-bold text-[15px] tracking-[-0.01em] text-center"
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {title}
        </span>
      </div>

      <div className="flex items-center justify-end min-h-[44px]">
        {rightAction ? (
          <button
            type="button"
            onClick={rightAction.onClick}
            aria-label={rightAction.label ?? 'Action'}
            className="inline-flex items-center justify-end gap-2 text-[var(--accent)] font-[family:var(--font-body)] text-[15px] font-medium active:opacity-70 transition-opacity"
          >
            {rightAction.icon}
            {rightAction.label ? <span>{rightAction.label}</span> : null}
          </button>
        ) : (
          <div />
        )}
      </div>
    </nav>
  )
}
