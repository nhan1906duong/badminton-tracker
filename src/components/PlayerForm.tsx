import { useState } from 'react'
import { useCreatePlayer } from '../hooks/usePlayers'
import { X, UserPlus } from 'lucide-react'
import { useI18n } from '../i18n'

interface PlayerFormProps {
  onClose: () => void
}

export default function PlayerForm({ onClose }: PlayerFormProps) {
  const { t } = useI18n()
  const createPlayer = useCreatePlayer()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError(t('playerForm.nameRequired'))
      return
    }
    if (name.trim().length > 100) {
      setError(t('playerForm.nameTooLong'))
      return
    }
    try {
      await createPlayer.mutateAsync({ name: name.trim(), email: email.trim() || undefined })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('playerForm.failedCreate'))
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'oklch(0% 0 0 / 0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          padding: 'var(--space-5)',
          paddingBottom: 'calc(var(--space-5) + env(safe-area-inset-bottom))',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 700,
              color: 'var(--fg)',
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
            }}
          >
            {t('playerForm.addPlayer')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--muted)',
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
            className="active:opacity-60"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Name field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label
              htmlFor="player-name"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--muted)',
              }}
            >
              {t('playerForm.name')}
            </label>
            <input
              id="player-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('playerForm.namePlaceholder')}
              autoFocus
              style={{
                width: '100%',
                minHeight: 52,
                padding: '0 var(--space-4)',
                fontSize: 'var(--text-base)',
                fontFamily: 'var(--font-body)',
                background: 'var(--surface)',
                border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                color: 'var(--fg)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.border = '2px solid var(--fg)' }}
              onBlur={e => { e.currentTarget.style.border = `1px solid ${error ? 'var(--danger)' : 'var(--border)'}` }}
            />
          </div>

          {/* Email field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label
              htmlFor="player-email"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--muted)',
              }}
            >
              {t('playerForm.emailOptional')}
            </label>
            <input
              id="player-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="john@example.com"
              style={{
                width: '100%',
                minHeight: 52,
                padding: '0 var(--space-4)',
                fontSize: 'var(--text-base)',
                fontFamily: 'var(--font-body)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--fg)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.border = '2px solid var(--fg)' }}
              onBlur={e => { e.currentTarget.style.border = '1px solid var(--border)' }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--font-body)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={createPlayer.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              width: '100%',
              minHeight: 52,
              background: 'var(--fg)',
              color: 'var(--surface)',
              border: '2px solid var(--fg)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-base)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              opacity: createPlayer.isPending ? 0.5 : 1,
            }}
            className="active:opacity-70"
          >
            <UserPlus size={16} />
            {createPlayer.isPending ? t('common.creating') : t('playerForm.addPlayer')}
          </button>
        </form>
      </div>
    </div>
  )
}
