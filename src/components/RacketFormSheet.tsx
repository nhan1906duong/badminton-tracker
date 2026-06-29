import { lazy, Suspense, useState } from 'react'
import { BottomSheet, Button, Input, SegmentedControl } from '../../design-system/components'
import { useCreatePlayerRacket, useUpdatePlayerRacket } from '../hooks/usePlayerRackets'
import { useI18n } from '../i18n'
import { getMascot, getMascotPreviewPath } from '../lib/mascots'
import { type PlayerRacket, RACKET_BRANDS, type RacketBrand } from '../types/database'
import MascotPicker from './MascotPicker'

const LottieMascot = lazy(() => import('./LottieMascot'))

function initialBrandChoice(brand?: string): RacketBrand {
  if (brand && (RACKET_BRANDS as readonly string[]).includes(brand)) return brand as RacketBrand
  return brand ? 'Other' : RACKET_BRANDS[0]
}

interface RacketFormSheetProps {
  open: boolean
  onClose: () => void
  playerId: string
  racket?: PlayerRacket
  onCreated?: (racketName: string) => void
}

export function RacketFormSheet({
  open,
  onClose,
  playerId,
  racket,
  onCreated,
}: RacketFormSheetProps) {
  const { t } = useI18n()
  const [brandChoice, setBrandChoice] = useState<RacketBrand>(() =>
    initialBrandChoice(racket?.brand),
  )
  const [customBrand, setCustomBrand] = useState(() =>
    initialBrandChoice(racket?.brand) === 'Other' ? (racket?.brand ?? '') : '',
  )
  const [realName, setRealName] = useState(racket?.real_name ?? '')
  const [nickname, setNickname] = useState(racket?.nickname ?? '')
  const [mascotId, setMascotId] = useState<string | null>(racket?.mascot_id ?? null)
  const [showMascotPicker, setShowMascotPicker] = useState(false)
  const [error, setError] = useState('')
  const createRacket = useCreatePlayerRacket()
  const updateRacket = useUpdatePlayerRacket()
  const isPending = createRacket.isPending || updateRacket.isPending
  const mascot = getMascot(mascotId)

  function handleClose() {
    setBrandChoice(initialBrandChoice(racket?.brand))
    setCustomBrand(initialBrandChoice(racket?.brand) === 'Other' ? (racket?.brand ?? '') : '')
    setRealName(racket?.real_name ?? '')
    setNickname(racket?.nickname ?? '')
    setMascotId(racket?.mascot_id ?? null)
    setError('')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmedName = realName.trim()
    if (!trimmedName) {
      setError(t('racketForm.nameRequired'))
      return
    }
    if (trimmedName.length > 60) {
      setError(t('racketForm.nameTooLong'))
      return
    }
    const brand = brandChoice === 'Other' ? customBrand.trim() : brandChoice
    if (!brand) {
      setError(t('racketForm.brandRequired'))
      return
    }
    try {
      if (racket) {
        await updateRacket.mutateAsync({
          id: racket.id,
          brand,
          real_name: trimmedName,
          nickname: nickname.trim(),
          mascot_id: mascotId,
        })
      } else {
        await createRacket.mutateAsync({
          player_id: playerId,
          brand,
          real_name: trimmedName,
          nickname: nickname.trim(),
          mascot_id: mascotId,
        })
        onCreated?.(`${brand} ${trimmedName}`)
      }
      handleClose()
    } catch {
      setError(t('racketForm.failedSave'))
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <form
        onSubmit={handleSubmit}
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
          {racket ? t('racketForm.editTitle') : t('racketForm.addTitle')}
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
            {t('racketForm.brand')}
          </label>
          <SegmentedControl
            tabs={RACKET_BRANDS.map(b => ({ id: b, label: b }))}
            value={brandChoice}
            onChange={setBrandChoice}
          />
        </div>

        {brandChoice === 'Other' && (
          <Input
            label={t('racketForm.customBrand')}
            value={customBrand}
            onChange={e => setCustomBrand(e.target.value)}
            placeholder={t('racketForm.customBrandPlaceholder')}
          />
        )}

        <Input
          label={t('racketForm.realName')}
          value={realName}
          onChange={e => setRealName(e.target.value)}
          placeholder={t('racketForm.realNamePlaceholder')}
          autoFocus
          error={error}
        />

        <Input
          label={t('racketForm.nickname')}
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder={t('racketForm.nicknamePlaceholder')}
        />

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
            {t('racketForm.mascot')}
          </label>
          <button
            type="button"
            onClick={() => setShowMascotPicker(true)}
            className="flex items-center gap-3 active:opacity-70"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              background: 'transparent',
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            {mascot ? (
              <Suspense fallback={<span style={{ width: 32, height: 32 }} />}>
                <LottieMascot src={getMascotPreviewPath(mascot)} size={32} scale={mascot.scale} />
              </Suspense>
            ) : (
              <span style={{ fontSize: 24, lineHeight: 1, width: 32, textAlign: 'center' }}>
                🚫
              </span>
            )}
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--fg)' }}>
              {mascot ? mascot.name : t('mascotPicker.none')}
            </span>
          </button>
        </div>

        <Button type="submit" variant="primary" size="block" disabled={isPending}>
          {isPending ? t('common.creating') : t('common.save')}
        </Button>
      </form>

      <MascotPicker
        open={showMascotPicker}
        currentMascotId={mascotId}
        onSelect={setMascotId}
        onClose={() => setShowMascotPicker(false)}
      />
    </BottomSheet>
  )
}
