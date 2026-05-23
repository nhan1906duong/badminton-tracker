import type { ReactNode } from 'react'
import { Button } from './button'
import type { ButtonProps } from './button'

export interface DialogAction {
  label: string
  onClick: () => void
  variant?: ButtonProps['variant']
}

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  /** Controls icon + tint colour. Default: 'info' */
  kind?: 'info' | 'warning' | 'danger'
  /** Custom icon. Overrides the default icon for `kind`. */
  icon?: ReactNode
  /** Defaults to a single primary "Got it" dismiss button. */
  actions?: DialogAction[]
}

// ── Icons ──────────────────────────────────────────────────────────────────

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function DangerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

const KIND_CONFIG = {
  info: {
    color: 'var(--info)',
    tint: 'oklch(from var(--info) l c h / 0.10)',
    defaultIcon: <InfoIcon />,
  },
  warning: {
    color: 'var(--warn)',
    tint: 'oklch(from var(--warn) l c h / 0.10)',
    defaultIcon: <WarningIcon />,
  },
  danger: {
    color: 'var(--danger)',
    tint: 'oklch(from var(--danger) l c h / 0.10)',
    defaultIcon: <DangerIcon />,
  },
} as const

// ── Component ──────────────────────────────────────────────────────────────

export function Dialog({
  open,
  onClose,
  title,
  description,
  kind = 'info',
  icon,
  actions,
}: DialogProps) {
  if (!open) return null

  const { color, tint, defaultIcon } = KIND_CONFIG[kind]
  const resolvedIcon = icon ?? defaultIcon
  const resolvedActions: DialogAction[] = actions ?? [{ label: 'Got it', onClick: onClose, variant: 'primary' }]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8"
      style={{ background: 'oklch(0% 0 0 / 0.40)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[var(--surface)] overflow-hidden"
        style={{
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 8px 32px oklch(0% 0 0 / 0.24)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + text */}
        <div className="px-5 pt-5 pb-4 flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-[var(--radius-lg)] flex-shrink-0 grid place-items-center"
            style={{ background: tint, color }}
          >
            {resolvedIcon}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <p
              className="font-[family:var(--font-display)] font-bold text-[var(--fg)] leading-tight"
              style={{ fontSize: 16 }}
            >
              {title}
            </p>
            <p className="text-[var(--muted)] mt-1 leading-snug" style={{ fontSize: 14 }}>
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className={`px-5 pb-5 flex gap-3 ${resolvedActions.length > 1 ? 'flex-row' : 'flex-col'}`}>
          {resolvedActions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? 'primary'}
              size="block"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
