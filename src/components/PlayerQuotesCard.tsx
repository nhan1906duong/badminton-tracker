import { useState } from 'react'
import { Plus, Pencil, Trash2, Quote as QuoteIcon } from 'lucide-react'
import { SectionLabel, Dialog } from '../../design-system/components'
import { usePlayerQuotes, useDeletePlayerQuote } from '../hooks/usePlayerQuotes'
import { MAX_QUOTES_PER_PLAYER, type PlayerQuote } from '../types/database'
import { useI18n } from '../i18n'

interface PlayerQuotesCardProps {
  playerId: string
  canEdit: boolean
  onAdd: () => void
  onEdit: (quote: PlayerQuote) => void
}

export function PlayerQuotesCard({ playerId, canEdit, onAdd, onEdit }: PlayerQuotesCardProps) {
  const { t } = useI18n()
  const { data: quotes = [], isLoading } = usePlayerQuotes(playerId)
  const deleteQuote = useDeletePlayerQuote()
  const [deletingQuote, setDeletingQuote] = useState<PlayerQuote | null>(null)
  const canAddMore = quotes.length < MAX_QUOTES_PER_PLAYER

  if (isLoading) return null
  if (!canEdit && quotes.length === 0) return null

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
      <SectionLabel
        action={
          canEdit ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
              {t('players.quotesCount', { count: quotes.length, max: MAX_QUOTES_PER_PLAYER })}
            </span>
          ) : undefined
        }
      >
        {t('players.quotes')}
      </SectionLabel>

      {quotes.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {t('players.noQuotes')}
        </p>
      ) : (
        quotes.map((quote) => (
          <div
            key={quote.id}
            className="flex items-start gap-3"
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3) var(--space-4)',
            }}
          >
            <QuoteIcon size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <p className="flex-1 min-w-0 text-[14px]" style={{ color: 'var(--fg)' }}>
              {quote.text}
            </p>
            {canEdit && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEdit(quote)}
                  aria-label={t('players.editQuote')}
                  className="active:opacity-60"
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setDeletingQuote(quote)}
                  aria-label={t('common.delete')}
                  className="active:opacity-60"
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {canEdit && canAddMore && (
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-2 active:opacity-70"
          style={{
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            color: 'var(--muted)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <Plus size={15} />
          {t('players.addQuote')}
        </button>
      )}

      <Dialog
        open={!!deletingQuote}
        onClose={() => setDeletingQuote(null)}
        title={t('players.deleteQuote')}
        description={t('players.deleteQuoteDescription')}
        kind="danger"
        actions={[
          { label: t('common.cancel'), onClick: () => setDeletingQuote(null), variant: 'secondary' },
          {
            label: t('common.delete'),
            variant: 'danger',
            onClick: () => {
              if (deletingQuote) {
                deleteQuote.mutate({ id: deletingQuote.id, player_id: deletingQuote.player_id })
              }
              setDeletingQuote(null)
            },
          },
        ]}
      />
    </div>
  )
}
