import type { ReactNode } from 'react'

interface FloatingActionButtonProps {
  onClick: () => void
  icon: ReactNode
  ariaLabel?: string
}

/**
 * Floating action button anchored to the bottom-right of the mobile container.
 *
 * Uses a fixed wrapper with `max-w-lg mx-auto` so the button stays within the
 * mobile viewport (max 512px), preventing it from drifting off-edge on wider
 * screens. The wrapper is non-interactive (`pointer-events-none`) so it
 * doesn't block taps on content beneath it.
 */
export default function FloatingActionButton({ onClick, icon, ariaLabel }: FloatingActionButtonProps) {
  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-lg mx-auto px-4 z-30 pointer-events-none">
      <div className="flex justify-end">
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={onClick}
          className="pointer-events-auto w-14 h-14 bg-green-600 text-white rounded-full shadow-lg shadow-green-600/25 flex items-center justify-center active:scale-90 transition-transform"
        >
          {icon}
        </button>
      </div>
    </div>
  )
}
