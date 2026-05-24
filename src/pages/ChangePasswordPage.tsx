import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { AppBar, Button, Input } from '../../design-system/components'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useI18n } from '../i18n'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useI18n()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError(t('settings.changePassword.mismatch'))
      return
    }
    if (newPassword.length < 6) {
      setError(t('settings.changePassword.tooShort'))
      return
    }

    setIsPending(true)
    try {
      // Re-authenticate with current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      })
      if (signInError) {
        setError(t('settings.changePassword.wrongCurrent'))
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.failedTryAgain'))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
      <AppBar
        title={t('settings.changePassword.title')}
        leftAction={{
          icon: <ChevronLeft className="h-5 w-5 -ml-1" />,
          onClick: () => navigate(-1),
        }}
      />

      <div className="flex-1 px-[var(--space-5)] pt-[var(--space-5)]">
        {success ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-[var(--space-5)] text-center space-y-3">
            <p className="text-[15px] font-semibold text-[var(--fg)]">
              {t('settings.changePassword.success')}
            </p>
            <Button variant="accent" size="block" onClick={() => navigate(-1)}>
              {t('common.done')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
            <Input
              label={t('settings.changePassword.current')}
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="flex items-center justify-center w-8 h-8 text-[var(--muted)] active:text-[var(--fg)]"
                  tabIndex={-1}
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            <Input
              label={t('settings.changePassword.new')}
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="flex items-center justify-center w-8 h-8 text-[var(--muted)] active:text-[var(--fg)]"
                  tabIndex={-1}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            <Input
              label={t('settings.changePassword.confirm')}
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="flex items-center justify-center w-8 h-8 text-[var(--muted)] active:text-[var(--fg)]"
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {error && (
              <p className="text-[13px] text-[var(--danger)] -mt-[var(--space-1)]">{error}</p>
            )}

            <Button type="submit" variant="accent" size="block" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? t('settings.changePassword.saving') : t('settings.changePassword.save')}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
