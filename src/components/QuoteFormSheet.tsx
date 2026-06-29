import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BottomSheet, Button } from '../../design-system/components'
import { useCreatePlayerQuote, useUpdatePlayerQuote } from '../hooks/usePlayerQuotes'
import { useI18n } from '../i18n'
import { QuoteSchema, type QuoteValues } from '../lib/schemas/form-schemas'
import { type PlayerQuote, QUOTE_MAX_LENGTH } from '../types/database'

interface QuoteFormSheetProps {
  open: boolean
  onClose: () => void
  playerId: string
  quote?: PlayerQuote
}

export function QuoteFormSheet({ open, onClose, playerId, quote }: QuoteFormSheetProps) {
  const { t } = useI18n()
  const [submitError, setSubmitError] = useState('')
  const createQuote = useCreatePlayerQuote()
  const updateQuote = useUpdatePlayerQuote()
  const isPending = createQuote.isPending || updateQuote.isPending

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<QuoteValues>({
    resolver: zodResolver(QuoteSchema),
    defaultValues: { text: quote?.text ?? '' },
  })

  useEffect(() => {
    reset({ text: quote?.text ?? '' })
  }, [open, quote, reset])

  const textValue = watch('text')

  function handleClose() {
    reset({ text: quote?.text ?? '' })
    setSubmitError('')
    onClose()
  }

  async function onSubmit(data: QuoteValues) {
    setSubmitError('')
    const trimmed = data.text.trim()
    try {
      if (quote) {
        await updateQuote.mutateAsync({ id: quote.id, text: trimmed })
      } else {
        await createQuote.mutateAsync({ player_id: playerId, text: trimmed })
      }
      handleClose()
    } catch {
      setSubmitError(t('quoteForm.failedSave'))
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          padding: '0 var(--space-2)',
        }}
      >
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
            placeholder={t('quoteForm.textPlaceholder')}
            autoFocus
            rows={3}
            maxLength={QUOTE_MAX_LENGTH}
            className={`w-full px-4 py-3.5 text-[15px] bg-[var(--surface)] border rounded-[var(--radius-sm)] outline-none placeholder:text-[var(--muted)] placeholder:opacity-60 focus:border-[var(--fg)] focus:border-2 resize-none ${errors.text ? 'border-[var(--danger)]' : 'border-[var(--border)]'}`}
            style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}
            {...register('text')}
          />
          <div className="flex items-center justify-between">
            {errors.text || submitError ? (
              <p className="text-[11px]" style={{ color: 'var(--danger)' }}>
                {errors.text?.message ?? submitError}
              </p>
            ) : (
              <span />
            )}
            <p
              className="text-[11px]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
            >
              {(textValue ?? '').trim().length}/{QUOTE_MAX_LENGTH}
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
