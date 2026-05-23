import type { ReactNode } from 'react'

interface ListItemProps {
  avatar?: string
  title: string
  subtitle?: string
  action?: ReactNode
  onClick?: () => void
  className?: string
}

export function ListItem({
  avatar,
  title,
  subtitle,
  action,
  onClick,
  className = '',
}: ListItemProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${onClick ? 'cursor-pointer active:bg-[var(--bg)]' : ''} ${className}`}
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
      onClick={onClick}
    >
      {avatar && (
        <div
          className="w-10 h-10 shrink-0 flex items-center justify-center font-extrabold text-[18px]"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'var(--fg)',
            color: 'var(--surface)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {avatar}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div
          className="text-[15px] font-semibold leading-[1.3] truncate"
          style={{ color: 'var(--fg)' }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className="text-[13px] leading-[1.3]"
            style={{ color: 'var(--muted)' }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {action && (
        <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {action}
        </div>
      )}
    </div>
  )
}
