import { Pencil, Star, Trash2 } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Dialog, SectionLabel } from '../../design-system/components'
import { useDeletePlayerRacket, usePlayerRackets } from '../hooks/usePlayerRackets'
import { useUpdatePlayer } from '../hooks/usePlayers'
import { useI18n } from '../i18n'
import { getMascot, getMascotPreviewPath } from '../lib/mascots'
import { MAX_RACKETS_PER_PLAYER, type PlayerRacket } from '../types/database'

const LottieMascot = lazy(() => import('./LottieMascot'))

interface PlayerRacketsCardProps {
  playerId: string
  canEdit: boolean
  activeRacketId?: string | null
  onEdit: (racket: PlayerRacket) => void
}

export function PlayerRacketsCard({
  playerId,
  canEdit,
  activeRacketId,
  onEdit,
}: PlayerRacketsCardProps) {
  const { t } = useI18n()
  const { data: rackets = [], isLoading } = usePlayerRackets(playerId)
  const deleteRacket = useDeletePlayerRacket()
  const updatePlayer = useUpdatePlayer()
  const [deletingRacket, setDeletingRacket] = useState<PlayerRacket | null>(null)

  if (isLoading) return null
  if (!canEdit && rackets.length === 0) return null

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
      <SectionLabel
        action={
          canEdit ? (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--muted)',
              }}
            >
              {t('players.racketsCount', { count: rackets.length, max: MAX_RACKETS_PER_PLAYER })}
            </span>
          ) : undefined
        }
      >
        {t('players.rackets')}
      </SectionLabel>

      {rackets.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {t('players.noRackets')}
        </p>
      ) : (
        rackets.map(racket => {
          const isActive = activeRacketId === racket.id
          const mascot = getMascot(racket.mascot_id)
          return (
            <div
              key={racket.id}
              className="flex items-center gap-3"
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3) var(--space-4)',
                border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
              }}
            >
              {mascot && (
                <Suspense
                  fallback={<span style={{ width: 32, height: 32 }} className="shrink-0" />}
                >
                  <LottieMascot
                    src={getMascotPreviewPath(mascot)}
                    size={32}
                    scale={mascot.scale}
                    className="shrink-0"
                  />
                </Suspense>
              )}
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
                {isActive && (
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                    style={{ color: 'var(--accent)', marginTop: 2 }}
                  >
                    {t('players.activeRacket')}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      updatePlayer.mutate({
                        id: playerId,
                        active_racket_id: isActive ? null : racket.id,
                      })
                    }
                    aria-label={t('players.setActiveRacket')}
                    className="active:opacity-60"
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? 'var(--accent)' : 'var(--muted)',
                    }}
                  >
                    <Star size={15} fill={isActive ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => onEdit(racket)}
                    aria-label={t('players.editRacket')}
                    className="active:opacity-60"
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted)',
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeletingRacket(racket)}
                    aria-label={t('common.delete')}
                    className="active:opacity-60"
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted)',
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}

      <Dialog
        open={!!deletingRacket}
        onClose={() => setDeletingRacket(null)}
        title={t('players.deleteRacket')}
        description={t('players.deleteRacketDescription')}
        kind="danger"
        actions={[
          {
            label: t('common.cancel'),
            onClick: () => setDeletingRacket(null),
            variant: 'secondary',
          },
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
