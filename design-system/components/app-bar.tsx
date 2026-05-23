import type { ReactNode } from 'react'

export interface AppBarProps {
  title: string
  titleAlign?: 'center' | 'left'
  titleVisible?: boolean
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

export function AppBar({ title, titleAlign = 'left', titleVisible = true, leftAction, rightAction, className = '', style }: AppBarProps) {
  const isLeft = titleAlign === 'left'

  return (
    <nav
      className={`sticky top-0 z-40 grid items-center gap-3 px-4 py-3 bg-[color-mix(in_oklch,var(--bg)_88%,transparent)] backdrop-blur-xl border-b border-transparent ${
        isLeft ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-[1fr_auto_1fr]'
      } ${className}`}
      style={{
        WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        ...style,
      }}
    >
      {/* Left action */}
      <div className="flex items-center justify-start min-h-[44px] shrink-0">
        {leftAction && (
          <button
            type="button"
            onClick={leftAction.onClick}
            aria-label={leftAction.label ?? 'Back'}
            className="inline-flex items-center gap-2 text-[var(--accent)] font-[family:var(--font-body)] text-[15px] font-medium active:opacity-70 transition-opacity"
          >
            {leftAction.icon ?? null}
            {leftAction.label ? <span>{leftAction.label}</span> : null}
          </button>
        )}
      </div>

      {/* Title */}
      <div className={`flex items-center min-h-[44px] min-w-0 ${isLeft ? 'justify-start' : 'justify-center'}`}>
        <span
          className={`font-[family:var(--font-display)] font-bold text-[15px] tracking-[-0.01em] text-[var(--fg)] truncate transition-[opacity,transform] duration-200 ${
            isLeft ? 'text-left' : 'text-center max-w-[200px]'
          } ${titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
        >
          {title}
        </span>
      </div>

      {/* Right action */}
      <div className="flex items-center justify-end min-h-[44px] shrink-0">
        {rightAction && (
          <button
            type="button"
            onClick={rightAction.onClick}
            aria-label={rightAction.label ?? 'Action'}
            className="inline-flex items-center justify-end gap-2 text-[var(--accent)] font-[family:var(--font-body)] text-[15px] font-medium active:opacity-70 transition-opacity"
          >
            {rightAction.icon}
            {rightAction.label ? <span>{rightAction.label}</span> : null}
          </button>
        )}
      </div>
    </nav>
  )
}
