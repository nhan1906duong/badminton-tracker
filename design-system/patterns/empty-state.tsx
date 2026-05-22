import type { ReactNode } from 'react'
import { Button } from '../components/button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void; variant?: 'primary' | 'accent' }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="text-center py-12 px-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}
    >
      {icon && (
        <div className="mb-3" style={{ color: 'var(--muted)' }}>
          {icon}
        </div>
      )}
      <h3
        className="text-[24px] font-extrabold mb-2"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-[13px] mb-4 max-w-[280px] mx-auto" style={{ color: 'var(--muted)' }}>
          {description}
        </p>
      )}
      {action && (
        <Button variant={action.variant || 'accent'} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
