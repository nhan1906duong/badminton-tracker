import { Suspense, lazy, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Settings2, Star } from 'lucide-react'
import { BottomSheet, BottomSheetCancel, BottomSheetDivider, BottomSheetItem, SectionLabel } from '../../design-system/components'
import { usePlayerRackets } from '../hooks/usePlayerRackets'
import { useUpdatePlayer } from '../hooks/usePlayers'
import { getMascot, getMascotPreviewPath } from '../lib/mascots'
import { useI18n } from '../i18n'

const LottieMascot = lazy(() => import('./LottieMascot'))

interface Props {
  playerId: string
  canEdit: boolean
  isMe: boolean
  activeRacketId?: string | null
}

export function PlayerRacketHeaderCard({ playerId, canEdit, isMe, activeRacketId }: Props) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data: rackets = [], isLoading } = usePlayerRackets(playerId)
  const updatePlayer = useUpdatePlayer()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (isLoading) return null
  if (!canEdit && rackets.length === 0) return null

  const featured = rackets.find((r) => r.id === activeRacketId) ?? rackets[0]

  return (
    <>
      <div className="overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
        <button
          onClick={() => setSheetOpen(true)}
          className="page-enter-right w-full flex items-stretch text-left active:bg-[var(--bg)]"
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            minHeight: 44,
            gap: 32,
            animationDuration: '1000ms',
          }}
        >
          <img
            src="/racket-header.jpg"
            alt=""
            aria-hidden
            style={{
              width: 64,
              height: '100%',
              objectFit: 'cover',
              objectPosition: '85% 15%',
              borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
              flexShrink: 0,
            }}
          />
          <div className="flex-1 min-w-0 py-3 flex flex-col justify-center">
            {featured ? (
              <>
                <p
                  className="text-[14px] font-semibold truncate"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
                >
                  {featured.nickname || `${featured.brand} ${featured.real_name}`}
                </p>
                {featured.nickname && (
                  <p className="text-[12px] truncate" style={{ color: 'var(--muted)' }}>
                    {featured.brand} {featured.real_name}
                  </p>
                )}
                <p
                  className="text-[11px]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', marginTop: 2 }}
                >
                  {t('units.racket', { count: rackets.length })}
                </p>
              </>
            ) : (
              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>{t('players.noRackets')}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 shrink-0 mr-3 self-center" style={{ color: 'var(--muted)' }} />
        </button>
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <SectionLabel className="mb-2 px-[var(--space-2)]">{t('players.rackets')}</SectionLabel>

        {rackets.length === 0 ? (
          <p className="text-[13px] px-[var(--space-2)] py-[var(--space-2)]" style={{ color: 'var(--muted)' }}>
            {t('players.noRackets')}
          </p>
        ) : (
          <div className="flex flex-col">
            {rackets.map((racket) => {
              const isActive = activeRacketId === racket.id
              const mascot = getMascot(racket.mascot_id)
              const row = (
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {mascot && (
                    <Suspense fallback={<span style={{ width: 32, height: 32 }} className="shrink-0" />}>
                      <LottieMascot src={getMascotPreviewPath(mascot)} size={32} scale={mascot.scale} className="shrink-0" />
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
                  </div>
                </div>
              )
              if (!canEdit) {
                return (
                  <div key={racket.id} className="flex items-center" style={{ padding: 'var(--space-2) var(--space-2)', minHeight: 52 }}>
                    {row}
                  </div>
                )
              }
              return (
                <button
                  key={racket.id}
                  type="button"
                  onClick={() => updatePlayer.mutate({ id: playerId, active_racket_id: isActive ? null : racket.id })}
                  className="flex items-center gap-3 w-full text-left active:bg-[var(--bg)]"
                  style={{ padding: 'var(--space-2) var(--space-2)', minHeight: 52, borderRadius: 'var(--radius-md)' }}
                >
                  {row}
                  <Star size={16} className="shrink-0" style={{ color: isActive ? 'var(--accent)' : 'var(--muted)' }} fill={isActive ? 'currentColor' : 'none'} />
                </button>
              )
            })}
          </div>
        )}

        {isMe && (
          <>
            <BottomSheetDivider />
            <BottomSheetItem
              icon={<Settings2 size={18} />}
              label={t('players.manageRackets')}
              onClick={() => {
                setSheetOpen(false)
                setTimeout(() => navigate(`/players/${playerId}/rackets`), 300)
              }}
            />
          </>
        )}

        <BottomSheetCancel onClick={() => setSheetOpen(false)} />
      </BottomSheet>
    </>
  )
}
