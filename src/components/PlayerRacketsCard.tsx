import { useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { SectionLabel, Dialog } from '../../design-system/components'
import { usePlayerRackets, useDeletePlayerRacket } from '../hooks/usePlayerRackets'
import { RacketFormSheet } from './RacketFormSheet'
import { RacketAddedCelebration } from './RacketAddedCelebration'
import { MAX_RACKETS_PER_PLAYER, type PlayerRacket } from '../types/database'
import { useI18n } from '../i18n'

interface PlayerRacketsCardProps {
  playerId: string
  playerName: string
  canEdit: boolean
}

export function PlayerRacketsCard({ playerId, playerName, canEdit }: PlayerRacketsCardProps) {
  const { t } = useI18n()
  const { data: rackets = [], isLoading } = usePlayerRackets(playerId)
  const deleteRacket = useDeletePlayerRacket()
  const [editingRacket, setEditingRacket] = useState<PlayerRacket | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [deletingRacket, setDeletingRacket] = useState<PlayerRacket | null>(null)
  const [celebrationRacketName, setCelebrationRacketName] = useState<string | null>(null)

  if (isLoading) return null
  if (!canEdit && rackets.length === 0) return null

  const canAddMore = rackets.length < MAX_RACKETS_PER_PLAYER

  return (
    <div
      className="overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
      }}
    >
      <SectionLabel
        action={
          canEdit ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
              {t('players.racketsCount', { count: rackets.length, max: MAX_RACKETS_PER_PLAYER })}
            </span>
          ) : undefined
        }
        className="mb-3"
      >
        {t('players.rackets')}
      </SectionLabel>

      {rackets.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {t('players.noRackets')}
        </p>
      ) : (
        <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
          {rackets.map((racket) => (
            <div key={racket.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p
                  className="text-[14px] font-semibold truncate"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
                >
                  {racket.brand} {racket.real_name}
                </p>
                {racket.nickname && (
                  <p className="text-[12px] truncate" style={{ color: 'var(--muted)' }}>
                    {racket.nickname}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingRacket(racket)}
                    aria-label={t('players.editRacket')}
                    className="active:opacity-60"
                    style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeletingRacket(racket)}
                    aria-label={t('common.delete')}
                    className="active:opacity-60"
                    style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && canAddMore && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 active:opacity-70"
          style={{
            marginTop: 'var(--space-3)',
            padding: 'var(--space-2)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--muted)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
          }}
        >
          <Plus size={14} />
          {t('players.addRacket')}
        </button>
      )}

      {(isAdding || editingRacket) && (
        <RacketFormSheet
          open
          onClose={() => {
            setIsAdding(false)
            setEditingRacket(null)
          }}
          playerId={playerId}
          racket={editingRacket ?? undefined}
          onCreated={(racketName) => setCelebrationRacketName(racketName)}
        />
      )}

      <RacketAddedCelebration
        open={!!celebrationRacketName}
        onClose={() => setCelebrationRacketName(null)}
        playerName={playerName}
        racketName={celebrationRacketName ?? ''}
      />

      <Dialog
        open={!!deletingRacket}
        onClose={() => setDeletingRacket(null)}
        title={t('players.deleteRacket')}
        description={t('players.deleteRacketDescription')}
        kind="danger"
        actions={[
          { label: t('common.cancel'), onClick: () => setDeletingRacket(null), variant: 'secondary' },
          {
            label: t('common.delete'),
            variant: 'danger',
            onClick: () => {
              if (deletingRacket) {
                deleteRacket.mutate({ id: deletingRacket.id, player_id: deletingRacket.player_id })
              }
              setDeletingRacket(null)
            },
          },
        ]}
      />
    </div>
  )
}
