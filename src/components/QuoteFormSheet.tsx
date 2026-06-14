import { useState } from 'react'
import { BottomSheet } from '../../design-system/components'
import { Button } from '../../design-system/components'
import { useCreatePlayerQuote, useUpdatePlayerQuote } from '../hooks/usePlayerQuotes'
import { QUOTE_MAX_LENGTH, type PlayerQuote } from '../types/database'
import { useI18n } from '../i18n'

interface QuoteFormSheetProps {
  open: boolean
  onClose: () => void
  playerId: string
  quote?: PlayerQuote
}

export function QuoteFormSheet({ open, onClose, playerId, quote }: QuoteFormSheetProps) {
  const { t } = useI18n()
  const [text, setText] = useState(quote?.text ?? '')
  const [error, setError] = useState('')
  const createQuote = useCreatePlayerQuote()
  const updateQuote = useUpdatePlayerQuote()
  const isPending = createQuote.isPending || updateQuote.isPending

  function handleClose() {
    setText(quote?.text ?? '')
    setError('')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = text.trim()
    if (!trimmed) {
      setError(t('quoteForm.textRequired'))
      return
    }
    if (trimmed.length > QUOTE_MAX_LENGTH) {
      setError(t('quoteForm.textTooLong', { max: QUOTE_MAX_LENGTH }))
      return
    }
    try {
      if (quote) {
        await updateQuote.mutateAsync({ id: quote.id, text: trimmed })
      } else {
        await createQuote.mutateAsync({ player_id: playerId, text: trimmed })
      }
      handleClose()
    } catch {
      setError(t('quoteForm.failedSave'))
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: '0 var(--space-2)' }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
          }}
        >
          {quote ? t('quoteForm.editTitle') : t('quoteForm.addTitle')}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--muted)',
            }}
          >
            {t('quoteForm.text')}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('quoteForm.textPlaceholder')}
            autoFocus
            rows={3}
            maxLength={QUOTE_MAX_LENGTH}
            className={`w-full px-4 py-3.5 text-[15px] bg-[var(--surface)] border rounded-[var(--radius-sm)] outline-none placeholder:text-[var(--muted)] placeholder:opacity-60 focus:border-[var(--fg)] focus:border-2 resize-none ${error ? 'border-[var(--danger)]' : 'border-[var(--border)]'}`}
            style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}
          />
          <div className="flex items-center justify-between">
            {error ? (
              <p className="text-[11px]" style={{ color: 'var(--danger)' }}>{error}</p>
            ) : (
              <span />
            )}
            <p className="text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
              {text.trim().length}/{QUOTE_MAX_LENGTH}
            </p>
          </div>
        </div>

        <Button type="submit" variant="primary" size="block" disabled={isPending}>
          {isPending ? t('common.creating') : t('common.save')}
        </Button>
      </form>
    </BottomSheet>
  )
}
