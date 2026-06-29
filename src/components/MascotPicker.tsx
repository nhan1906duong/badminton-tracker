import { lazy, Suspense } from 'react'
import { BottomSheet } from '../../design-system/components'
import { useI18n } from '../i18n'
import { getMascotPreviewPath, MASCOTS, type Mascot } from '../lib/mascots'

const LottieMascot = lazy(() => import('./LottieMascot'))

interface MascotPickerProps {
  open: boolean
  currentMascotId?: string | null
  onSelect: (mascotId: string | null) => void
  onClose: () => void
}

export default function MascotPicker({
  open,
  currentMascotId,
  onSelect,
  onClose,
}: MascotPickerProps) {
  const { t } = useI18n()

  const handleSelect = (mascotId: string | null) => {
    onSelect(mascotId)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <p
        className="px-1"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 700,
          color: 'var(--fg)',
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
          marginBottom: 'var(--space-3)',
        }}
      >
        {t('mascotPicker.title')}
      </p>

      <div className="grid grid-cols-4 gap-3 pb-2">
        <button
          type="button"
          onClick={() => handleSelect(null)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-1)',
            padding: 'var(--space-2)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${currentMascotId == null ? 'var(--accent)' : 'var(--border)'}`,
            background: currentMascotId == null ? 'var(--accent-soft)' : 'transparent',
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
          className="active:opacity-70"
        >
          <span style={{ fontSize: 32, lineHeight: 1 }}>🚫</span>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {t('mascotPicker.none')}
          </span>
        </button>

        {MASCOTS.map(mascot => {
          const isSelected = currentMascotId === mascot.id
          return (
            <button
              key={mascot.id}
              type="button"
              onClick={() => handleSelect(mascot.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                background: isSelected ? 'var(--accent-soft)' : 'transparent',
                cursor: 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
              className="active:opacity-70"
            >
              <MascotPreview mascot={mascot} size={40} />
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--fg)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {mascot.name}
              </span>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}

function MascotPreview({ mascot, size }: { mascot: Mascot; size: number }) {
  const fallback = (
    <div
      role="img"
      aria-label={mascot.name}
      style={{ width: size, height: size, fontSize: size * 0.7 }}
      className="flex items-center justify-center shrink-0"
    >
      {mascot.emoji}
    </div>
  )

  return (
    <Suspense fallback={fallback}>
      <LottieMascot src={getMascotPreviewPath(mascot)} size={size} scale={mascot.scale} />
    </Suspense>
  )
}
