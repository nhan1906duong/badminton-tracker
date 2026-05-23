import type { ReactNode } from 'react'

// ── Base sheet ─────────────────────────────────────────────────────────────

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{
          background: 'oklch(0% 0 0 / 0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed bottom-0 left-1/2 w-full max-w-lg z-[101]"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          padding: `var(--space-3) var(--space-3) max(var(--space-5), calc(env(safe-area-inset-bottom) + var(--space-4)))`,
          boxShadow: '0 -4px 32px oklch(0% 0 0 / 0.12)',
          transform: open ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(110%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0, 0.15, 1)',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 36,
            height: 4,
            background: 'var(--border)',
            borderRadius: 2,
            margin: '0 auto var(--space-4)',
          }}
        />
        {children}
      </div>
    </>
  )
}

// ── Item ───────────────────────────────────────────────────────────────────

export interface BottomSheetItemProps {
  icon?: ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}

export function BottomSheetItem({ icon, label, onClick, danger = false }: BottomSheetItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-[var(--space-3)] text-left active:bg-[var(--bg)] transition-colors duration-[var(--duration-fast)]"
      style={{
        padding: `var(--space-3) var(--space-4)`,
        background: 'transparent',
        border: 'none',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-base)',
        fontWeight: 500,
        color: danger ? 'var(--danger)' : 'var(--fg)',
        cursor: 'pointer',
        minHeight: 52,
        borderRadius: 'var(--radius-md)',
        touchAction: 'manipulation',
      }}
    >
      {icon && (
        <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
          {icon}
        </span>
      )}
      <span>{label}</span>
    </button>
  )
}

// ── Divider ────────────────────────────────────────────────────────────────

export function BottomSheetDivider() {
  return (
    <div
      style={{
        height: 1,
        background: 'var(--border)',
        margin: `var(--space-2) var(--space-2)`,
      }}
    />
  )
}

// ── Cancel ─────────────────────────────────────────────────────────────────

export interface BottomSheetCancelProps {
  onClick: () => void
  label?: string
}

export function BottomSheetCancel({ onClick, label = 'Cancel' }: BottomSheetCancelProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full active:opacity-70 transition-opacity duration-[var(--duration-fast)]"
      style={{
        padding: 'var(--space-3)',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-base)',
        fontWeight: 600,
        color: 'var(--fg)',
        cursor: 'pointer',
        minHeight: 48,
        marginTop: 'var(--space-3)',
        touchAction: 'manipulation',
      }}
    >
      {label}
    </button>
  )
}
