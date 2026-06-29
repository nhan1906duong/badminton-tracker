import { zodResolver } from '@hookform/resolvers/zod'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { BottomSheet, Button, Input, SegmentedControl } from '../../design-system/components'
import { useCreatePlayerRacket, useUpdatePlayerRacket } from '../hooks/usePlayerRackets'
import { useI18n } from '../i18n'
import { getMascot, getMascotPreviewPath } from '../lib/mascots'
import { RacketFormSchema, type RacketFormValues } from '../lib/schemas/form-schemas'
import { type PlayerRacket, RACKET_BRANDS, type RacketBrand } from '../types/database'
import MascotPicker from './MascotPicker'

const LottieMascot = lazy(() => import('./LottieMascot'))

function initialBrandChoice(brand?: string): RacketBrand {
  if (brand && (RACKET_BRANDS as readonly string[]).includes(brand)) return brand as RacketBrand
  return brand ? 'Other' : RACKET_BRANDS[0]
}

function buildDefaultValues(racket?: PlayerRacket): RacketFormValues {
  return {
    brandChoice: initialBrandChoice(racket?.brand),
    customBrand: initialBrandChoice(racket?.brand) === 'Other' ? (racket?.brand ?? '') : '',
    real_name: racket?.real_name ?? '',
    nickname: racket?.nickname ?? '',
    mascot_id: racket?.mascot_id ?? null,
  }
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
  const [showMascotPicker, setShowMascotPicker] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const createRacket = useCreatePlayerRacket()
  const updateRacket = useUpdatePlayerRacket()
  const isPending = createRacket.isPending || updateRacket.isPending

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<RacketFormValues>({
    resolver: zodResolver(RacketFormSchema),
    defaultValues: buildDefaultValues(racket),
  })

  useEffect(() => {
    reset(buildDefaultValues(racket))
  }, [open, racket, reset])

  const brandChoice = watch('brandChoice') as RacketBrand
  const mascotId = watch('mascot_id')
  const mascot = getMascot(mascotId)

  function handleClose() {
    reset(buildDefaultValues(racket))
    setSubmitError('')
    onClose()
  }

  async function onSubmit(data: RacketFormValues) {
    setSubmitError('')
    const brand = data.brandChoice === 'Other' ? (data.customBrand?.trim() ?? '') : data.brandChoice
    if (!brand) {
      setSubmitError(t('racketForm.brandRequired'))
      return
    }
    const trimmedName = data.real_name.trim()
    try {
      if (racket) {
        await updateRacket.mutateAsync({
          id: racket.id,
          brand,
          real_name: trimmedName,
          nickname: data.nickname?.trim() ?? '',
          mascot_id: data.mascot_id,
        })
      } else {
        await createRacket.mutateAsync({
          player_id: playerId,
          brand,
          real_name: trimmedName,
          nickname: data.nickname?.trim() ?? '',
          mascot_id: data.mascot_id,
        })
        onCreated?.(`${brand} ${trimmedName}`)
      }
      handleClose()
    } catch {
      setSubmitError(t('racketForm.failedSave'))
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
          <Controller
            name="brandChoice"
            control={control}
            render={({ field }) => (
              <SegmentedControl
                tabs={RACKET_BRANDS.map(b => ({ id: b, label: b }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {brandChoice === 'Other' && (
          <Input
            label={t('racketForm.customBrand')}
            placeholder={t('racketForm.customBrandPlaceholder')}
            error={submitError && !watch('customBrand')?.trim() ? submitError : undefined}
            {...register('customBrand')}
          />
        )}

        <Input
          label={t('racketForm.realName')}
          placeholder={t('racketForm.realNamePlaceholder')}
          autoFocus
          error={errors.real_name?.message}
          {...register('real_name')}
        />

        <Input
          label={t('racketForm.nickname')}
          placeholder={t('racketForm.nicknamePlaceholder')}
          {...register('nickname')}
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
          <Controller
            name="mascot_id"
            control={control}
            render={({ field }) => (
              <>
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
                      <LottieMascot
                        src={getMascotPreviewPath(mascot)}
                        size={32}
                        scale={mascot.scale}
                      />
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
                <MascotPicker
                  open={showMascotPicker}
                  currentMascotId={field.value}
                  onSelect={id => {
                    field.onChange(id)
                    setShowMascotPicker(false)
                  }}
                  onClose={() => setShowMascotPicker(false)}
                />
              </>
            )}
          />
        </div>

        {submitError && (
          <p style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--font-body)' }}>
            {submitError}
          </p>
        )}

        <Button type="submit" variant="primary" size="block" disabled={isPending}>
          {isPending ? t('common.creating') : t('common.save')}
        </Button>
      </form>
    </BottomSheet>
  )
}
