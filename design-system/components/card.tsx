import type { ReactNode, CSSProperties } from 'react'

export interface CardProps {
  interactive?: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export function Card({
  interactive = false,
  children,
  className = '',
  style,
  onClick,
}: CardProps) {
  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)] p-4 ${interactive ? 'cursor-pointer active:bg-[var(--bg)]' : ''} ${className}`}
      style={{ borderRadius: 'var(--radius-lg)', ...style }}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
    >
      {children}
    </div>
  )
}
