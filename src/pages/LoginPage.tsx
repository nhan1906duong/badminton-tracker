import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Input } from '../../design-system/components'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n'
import { LoginSchema, type LoginValues } from '../lib/schemas/form-schemas'

export default function LoginPage() {
  const { signInWithPassword, isSigningIn } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(LoginSchema) })

  async function onSubmit(data: LoginValues) {
    setSubmitError('')
    try {
      await signInWithPassword(data.email, data.password)
      const from = location.state?.from as { pathname?: string } | undefined
      navigate(from?.pathname || '/sessions', { replace: true })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('auth.invalidCredentials'))
    }
  }

  return (
    <div
      className="min-h-svh flex items-center justify-center p-[var(--space-5)]"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-[var(--space-5)]">
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
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-4)]">
          <Input
            label={t('auth.email')}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            rightAction={
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="flex items-center justify-center w-8 h-8 text-[var(--muted)] active:text-[var(--fg)]"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            {...register('password')}
          />

          {submitError && (
            <p className="text-[11px] text-[var(--danger)] -mt-[var(--space-1)]">{submitError}</p>
          )}

          <Button type="submit" variant="accent" size="block" disabled={isSigningIn}>
            {isSigningIn && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSigningIn ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/sessions')}
          className="mt-[var(--space-3)] text-[13px] text-[var(--muted)] underline underline-offset-2 active:opacity-60"
        >
          {t('auth.continueAsGuest')}
        </button>
      </div>
    </div>
  )
}
