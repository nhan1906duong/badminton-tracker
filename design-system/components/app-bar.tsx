import type { CSSProperties, ReactNode } from 'react'
import { useI18n } from '../../src/i18n'

interface AppBarAction {
  label?: string
  ariaLabel?: string
  icon?: ReactNode
  onClick: () => void
}

export interface AppBarProps {
  title: string
  titleAlign?: 'center' | 'left'
  titleVisible?: boolean
  backLabel?: string
  onBack?: () => void
  stuck?: boolean
  safeArea?: boolean
  leftAction?: AppBarAction
  rightAction?: AppBarAction
  className?: string
  style?: CSSProperties
}

export function AppBar({
  title = '',
  titleAlign = 'left',
  titleVisible = true,
  backLabel,
  onBack,
  stuck = false,
  safeArea = false,
  leftAction,
  rightAction,
  className = '',
  style,
}: AppBarProps) {
  const { t } = useI18n()
  const isLeft = titleAlign === 'left'
  const resolvedLeftAction: AppBarAction | undefined = leftAction ?? (
    backLabel || onBack
      ? {
          label: backLabel ?? t('common.back'),
          onClick: onBack ?? (() => window.history.back()),
        }
      : undefined
  )

  return (
    <nav
      className={`sticky top-0 z-40 grid items-center gap-3 px-4 py-3 bg-[color-mix(in_oklch,var(--bg)_88%,transparent)] backdrop-blur-xl ${stuck ? 'border-b border-[var(--border)]' : 'border-b border-transparent'} ${
        isLeft ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-[1fr_auto_1fr]'
      } ${className}`}
      style={{
        WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        ...(safeArea
          ? {
              paddingTop: 'max(12px, calc(env(safe-area-inset-top) + 8px))',
              paddingBottom: 12,
              background: 'color-mix(in oklch, var(--bg) 88%, transparent)',
            }
          : {}),
        ...style,
      }}
    >
      {/* Left action */}
      <div className="flex items-center justify-start min-h-[44px] shrink-0">
        {resolvedLeftAction && (
          <button
            type="button"
            onClick={resolvedLeftAction.onClick}
            aria-label={resolvedLeftAction.ariaLabel ?? resolvedLeftAction.label ?? t('common.back')}
            className="inline-flex items-center gap-2 text-[var(--accent)] font-[family:var(--font-body)] text-[15px] font-medium active:opacity-70 transition-opacity"
          >
            {resolvedLeftAction.icon ?? null}
            {resolvedLeftAction.label ? <span>{resolvedLeftAction.label}</span> : null}
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
            aria-label={rightAction.ariaLabel ?? rightAction.label ?? t('common.action')}
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
