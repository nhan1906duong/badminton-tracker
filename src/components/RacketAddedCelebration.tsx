import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import fireworkAnimation from '../assets/lottie/firework.lottie?url'
import { useI18n } from '../i18n'

interface RacketAddedCelebrationProps {
  open: boolean
  onClose: () => void
  playerName: string
  racketName: string
}

export function RacketAddedCelebration({ open, onClose, playerName, racketName }: RacketAddedCelebrationProps) {
  const { t } = useI18n()

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'oklch(0% 0 0 / 0.45)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm flex flex-col items-center text-center"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-5)',
          boxShadow: '0 8px 32px oklch(0% 0 0 / 0.24)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <DotLottieReact
          src={fireworkAnimation}
          loop
          autoplay
          style={{ width: 160, height: 160 }}
        />

        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
            marginTop: 'var(--space-2)',
          }}
        >
          {t('players.racketAddedMessage', { player: playerName, racket: racketName })}
        </p>
      </div>
    </div>
  )
}
