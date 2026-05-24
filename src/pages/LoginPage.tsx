import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { Button, Input } from '../../design-system/components'

export default function LoginPage() {
  const { signInWithPassword, isSigningIn } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await signInWithPassword(email, password)
      const from = location.state?.from as { pathname?: string } | undefined
      navigate(from?.pathname || '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.invalidCredentials'))
    }
  }

  return (
    <div
      className="min-h-svh flex items-center justify-center p-[var(--space-5)]"
      style={{
        background: 'var(--bg)',
        paddingTop: 'max(var(--space-5), calc(env(safe-area-inset-top) + var(--space-3)))',
        paddingBottom: 'max(var(--space-5), calc(env(safe-area-inset-bottom) + var(--space-3)))',
      }}
    >
      <div
        className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-[var(--space-5)]"
      >
        {/* Logo stamp */}
        <div className="flex flex-col items-center mb-[var(--space-6)]">
          <div
            className="w-14 h-14 flex items-center justify-center mb-[var(--space-3)]"
            style={{
              background: 'var(--accent)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span className="text-2xl leading-none select-none">🏸</span>
          </div>
          <h1
            className="text-[24px] font-extrabold tracking-[-0.02em] text-[var(--fg)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('app.name')}
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-[var(--space-1)]">
            {t('auth.signInSubtitle')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
          <Input
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <Input
            label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            rightAction={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex items-center justify-center w-8 h-8 text-[var(--muted)] active:text-[var(--fg)]"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          {error && (
            <p className="text-[11px] text-[var(--danger)] -mt-[var(--space-1)]">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="accent"
            size="block"
            disabled={isSigningIn}
          >
            {isSigningIn && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSigningIn ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>
      </div>
    </div>
  )
}
