import type { ReactNode } from 'react'

export interface BadgeProps {
  variant?: 'win' | 'loss' | 'neutral' | 'accent' | 'default'
  children: ReactNode
  className?: string
}

export function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] leading-none border'

  const variantStyles: Record<string, string> = {
    win: 'bg-[var(--success)] border-[var(--success)] text-[var(--surface)]',
    loss: 'bg-[var(--danger)] border-[var(--danger)] text-[var(--surface)]',
    neutral: 'bg-[var(--bg)] border-[var(--border)] text-[var(--muted)]',
    accent: 'bg-[var(--accent)] border-[var(--accent)] text-[var(--surface)]',
    default: 'bg-[var(--bg)] border-[var(--border)] text-[var(--fg)]',
  }

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={{ borderRadius: 'var(--radius-sm)' }}
    >
      {children}
    </span>
  )
}
