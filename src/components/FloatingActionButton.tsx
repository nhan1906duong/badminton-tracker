import type { ReactNode } from 'react'

interface FloatingActionButtonProps {
  onClick: () => void
  icon: ReactNode
  ariaLabel?: string
}

export default function FloatingActionButton({ onClick, icon, ariaLabel }: FloatingActionButtonProps) {
  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-lg mx-auto px-4 z-30 pointer-events-none">
      <div className="flex justify-end">
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={onClick}
          className="pointer-events-auto w-14 h-14 flex items-center justify-center"
          style={{
            background: 'var(--accent)',
            color: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: 'none',
            cursor: 'pointer',
            touchAction: 'manipulation',
            boxShadow: [
              '0 1px 2px oklch(0% 0 0 / 0.10)',
              '0 8px 24px oklch(55% 0.20 30 / 0.28)',
              '0 2px 6px oklch(55% 0.20 30 / 0.18)',
            ].join(', '),
            transition: [
              'transform 0.18s cubic-bezier(0.32, 0, 0.15, 1)',
              'box-shadow 0.18s ease',
              'opacity 0.12s ease',
            ].join(', '),
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = ''
          }}
          onMouseDown={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.transform = 'translateY(0) scale(0.96)'
            el.style.boxShadow = [
              '0 1px 2px oklch(0% 0 0 / 0.12)',
              '0 4px 12px oklch(55% 0.20 30 / 0.30)',
            ].join(', ')
          }}
          onMouseUp={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.transform = ''
            el.style.boxShadow = [
              '0 1px 2px oklch(0% 0 0 / 0.10)',
              '0 8px 24px oklch(55% 0.20 30 / 0.28)',
              '0 2px 6px oklch(55% 0.20 30 / 0.18)',
            ].join(', ')
          }}
          onTouchStart={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.transform = 'translateY(0) scale(0.96)'
            el.style.boxShadow = [
              '0 1px 2px oklch(0% 0 0 / 0.12)',
              '0 4px 12px oklch(55% 0.20 30 / 0.30)',
            ].join(', ')
          }}
          onTouchEnd={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.transform = ''
            el.style.boxShadow = [
              '0 1px 2px oklch(0% 0 0 / 0.10)',
              '0 8px 24px oklch(55% 0.20 30 / 0.28)',
              '0 2px 6px oklch(55% 0.20 30 / 0.18)',
            ].join(', ')
          }}
        >
          {icon}
        </button>
      </div>
    </div>
  )
}
