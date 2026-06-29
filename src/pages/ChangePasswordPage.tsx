import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../../design-system/components'
import { AppBar } from '../../design-system/components/app-bar'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n'
import { ChangePasswordSchema, type ChangePasswordValues } from '../lib/schemas/form-schemas'
import { supabase } from '../lib/supabase'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useI18n()

  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(ChangePasswordSchema),
  })

  async function onSubmit(data: ChangePasswordValues) {
    setSubmitError('')
    setIsPending(true)
    try {
      // Re-authenticate with current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: data.currentPassword,
      })
      if (signInError) {
        setSubmitError(t('account.changePassword.wrongCurrent'))
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: data.newPassword })
      if (updateError) throw updateError

      setSuccess(true)
      reset()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.failedTryAgain'))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
      <AppBar
        title={t('account.changePassword.title')}
        leftAction={{
          icon: <ChevronLeft className="h-5 w-5 -ml-1" />,
          onClick: () => navigate('/settings/account'),
        }}
      />

      <div className="flex-1 px-[var(--space-5)] pt-[var(--space-5)]">
        {success ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-[var(--space-5)] text-center space-y-3">
            <p className="text-[15px] font-semibold text-[var(--fg)]">
              {t('account.changePassword.success')}
            </p>
            <Button variant="accent" size="block" onClick={() => navigate('/settings/account')}>
              {t('common.done')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-4)]">
            <Input
              label={t('account.changePassword.current')}
              type={showCurrent ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  className="flex items-center justify-center w-8 h-8 text-[var(--muted)] active:text-[var(--fg)]"
                  tabIndex={-1}
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...register('currentPassword')}
            />
            <Input
              label={t('account.changePassword.new')}
              type={showNew ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="flex items-center justify-center w-8 h-8 text-[var(--muted)] active:text-[var(--fg)]"
                  tabIndex={-1}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...register('newPassword')}
            />
            <Input
              label={t('account.changePassword.confirm')}
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="flex items-center justify-center w-8 h-8 text-[var(--muted)] active:text-[var(--fg)]"
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...register('confirmPassword')}
            />

            {submitError && (
              <p className="text-[13px] text-[var(--danger)] -mt-[var(--space-1)]">{submitError}</p>
            )}

            <Button type="submit" variant="accent" size="block" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? t('account.changePassword.saving') : t('account.changePassword.save')}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
