import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useI18n } from '../i18n'

/**
 * Shown on top-level tab pages when the user is unauthenticated.
 * Pill-shaped chip with icon + label so first-time visitors recognize the entry point.
 */
export default function LoginAffordance() {
  const navigate = useNavigate()
  const { t } = useI18n()

  return (
    <button
      type="button"
      onClick={() => navigate('/login')}
      className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--fg)] active:bg-[var(--bg)] transition-colors shrink-0 touch-manipulation"
    >
      <LogIn size={14} className="text-[var(--muted)]" />
      <span className="text-[12px] font-bold uppercase tracking-[0.08em]">
        {t('auth.signIn')}
      </span>
    </button>
  )
}
