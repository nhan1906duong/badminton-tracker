import { Button } from '../components/button'
import { useI18n } from '../../src/i18n'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  const { t } = useI18n()

  return (
    <div
      className="text-center py-12 px-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}
    >
      <div
        className="text-[32px] font-extrabold mb-2"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--danger)' }}
      >
        !
      </div>
      <h3
        className="text-[18px] font-bold mb-2"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
      >
        {title ?? t('common.somethingWentWrong')}
      </h3>
      <p className="text-[13px] mb-4 max-w-[280px] mx-auto" style={{ color: 'var(--muted)' }}>
        {message}
      </p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          {t('common.tryAgain')}
        </Button>
      )}
    </div>
  )
}
