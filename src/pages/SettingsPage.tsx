import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useClearAllData, useRecalculateAllRatings } from '../hooks/useSessions'
import { Trash2, AlertTriangle, Palette, ChevronRight, RefreshCw, Info, User, Download } from 'lucide-react'
import { useBackupData } from '../hooks/useBackup'
import { useIsAdmin } from '../hooks/useIsAdmin'
import Avatar from '../components/Avatar'
import { useProfile, useUpdatePlayerLink } from '../hooks/useProfile'
import { usePlayers } from '../hooks/usePlayers'
import { useI18n, type Locale } from '../i18n'
import { BottomSheet, Dialog } from '../../design-system/components'

const IS_DEV = import.meta.env.DEV

export default function SettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { locale, setLocale, t } = useI18n()
  const clearAll = useClearAllData()
  const recalculate = useRecalculateAllRatings()
  const backup = useBackupData()
  const isAdmin = useIsAdmin()
  const [confirming, setConfirming] = useState(false)
  const [confirmRecalc, setConfirmRecalc] = useState(false)
  const { data: profile } = useProfile(user?.id)
  const { data: players = [] } = usePlayers()
  const updatePlayerLink = useUpdatePlayerLink()
  const [showPlayerPicker, setShowPlayerPicker] = useState(false)
  const [confirmUnlinkOpen, setConfirmUnlinkOpen] = useState(false)
  const [linkErrorOpen, setLinkErrorOpen] = useState(false)

  const linkedPlayer = profile?.player_id ? players.find((p) => p.id === profile.player_id) : null
  const nextLocale: Locale = locale === 'en' ? 'vi' : 'en'
  const localeFlag = locale === 'en' ? '🇬🇧' : '🇻🇳'
  const localeLabel = locale.toUpperCase()

  const handleClear = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    clearAll.mutate(undefined, {
      onSuccess: () => setConfirming(false),
    })
  }

  const handleRecalculate = () => {
    if (!confirmRecalc) {
      setConfirmRecalc(true)
      return
    }
    recalculate.mutate(undefined, {
      onSuccess: () => setConfirmRecalc(false),
      onError: () => setConfirmRecalc(false),
    })
  }

  const handleLinkPlayer = (playerId: string) => {
    if (!user) return
    updatePlayerLink.mutate(
      { userId: user.id, playerId },
      {
        onSuccess: () => setShowPlayerPicker(false),
        onError: () => {
          setShowPlayerPicker(false)
          setLinkErrorOpen(true)
        },
      },
    )
  }

  const handleUnlinkPlayer = () => {
    if (!user) return
    updatePlayerLink.mutate(
      { userId: user.id, playerId: null },
      {
        onSuccess: () => setConfirmUnlinkOpen(false),
      },
    )
  }

  return (
    <div className="min-h-svh bg-[var(--bg)]">
      <div
        className="px-[var(--space-5)] pb-32 space-y-[var(--space-3)]"
        style={{ paddingTop: 'var(--space-6)' }}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setLocale(nextLocale)}
            aria-label={t('settings.language')}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-[color-mix(in_oklch,var(--danger)_18%,transparent)] bg-[color-mix(in_oklch,var(--danger)_12%,var(--surface))] px-2 text-[var(--danger)] active:bg-[color-mix(in_oklch,var(--danger)_18%,var(--surface))] transition-colors"
          >
            <span className="text-[12px] leading-none">
              {localeFlag}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--danger)]">
              {localeLabel}
            </span>
          </button>
        </div>

        {/* Actions */}
        <section className="space-y-[var(--space-2)]">
          <section className="px-[var(--space-1)] pt-[var(--space-2)] pb-[var(--space-5)]">
            <div className="pb-[var(--space-2)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                {t('settings.linkedPlayer')}
              </p>
            </div>

            {linkedPlayer ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/players/${linkedPlayer.id}`)}
                  className="min-w-0 flex-1 flex items-center gap-3 active:opacity-60 transition-opacity"
                >
                  <Avatar src={linkedPlayer.avatar_url} name={linkedPlayer.name} size={36} />
                  <span className="flex-1 text-left text-[15px] font-semibold text-[var(--fg)] truncate">
                    {linkedPlayer.name}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmUnlinkOpen(true)}
                  disabled={updatePlayerLink.isPending}
                  className="shrink-0 text-[13px] font-semibold text-[var(--danger)] active:opacity-60 transition-opacity"
                >
                  {t('settings.unlinkPlayer')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPlayerPicker(true)}
                className="w-full flex items-center gap-3 active:opacity-60 transition-opacity"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <span className="flex-1 text-left text-[15px] font-semibold text-[var(--accent)]">
                  {t('settings.linkPlayer')}
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--muted)] shrink-0" />
              </button>
            )}
          </section>

          <button
            type="button"
            onClick={() => navigate('/settings/account')}
            className="w-full flex items-center gap-3 px-[var(--space-4)] py-[var(--space-4)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--fg)] active:bg-[var(--bg)] transition-colors"
          >
            <User className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left text-[15px] font-semibold">{t('settings.account')}</span>
            <ChevronRight className="w-5 h-5 text-[var(--muted)] shrink-0" />
          </button>

          <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
            <div className="px-[var(--space-4)] pt-[var(--space-4)] pb-[var(--space-2)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                {t('settings.bdfRules')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/settings/points')}
              className="w-full flex items-center gap-3 px-[var(--space-4)] py-3 text-[var(--fg)] active:bg-[var(--bg)] transition-colors"
            >
              <Info className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left text-[15px] font-semibold">{t('settings.howPointsWork')}</span>
              <ChevronRight className="w-5 h-5 text-[var(--muted)] shrink-0" />
            </button>

            <div className="mx-[var(--space-4)] border-t border-[var(--border)]" />

            <button
              type="button"
              onClick={handleRecalculate}
              disabled={recalculate.isPending}
              className={`w-full flex items-center gap-3 px-[var(--space-4)] py-3 transition-colors active:bg-[var(--bg)] ${
                confirmRecalc ? 'text-[var(--warn)]' : 'text-[var(--fg)]'
              }`}
            >
              {confirmRecalc ? (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              ) : (
                <RefreshCw className={`w-5 h-5 shrink-0 ${recalculate.isPending ? 'animate-spin' : ''}`} />
              )}
              <span className="flex-1 text-left text-[15px] font-semibold">
                {recalculate.isPending
                  ? t('settings.recalculating')
                  : confirmRecalc
                    ? t('settings.tapAgainRecalculate')
                    : t('settings.recalculateAllRatings')}
              </span>
            </button>
          </section>

        </section>

        {/* Admin-only: Backup */}
        {isAdmin && (
          <section className="space-y-[var(--space-2)]">
            <div className="flex items-center gap-2 px-1">
              <span className="font-[family:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--accent)] bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                {t('settings.adminSection')}
              </span>
            </div>
            <button
              onClick={() => backup.mutate()}
              disabled={backup.isPending}
              className="w-full flex items-center gap-3 px-[var(--space-4)] py-[var(--space-4)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--fg)] active:bg-[var(--bg)] transition-colors"
            >
              <Download className={`w-5 h-5 shrink-0 ${backup.isPending ? 'animate-pulse' : ''}`} />
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold">
                  {backup.isPending ? t('settings.backingUp') : t('settings.backupData')}
                </p>
                <p className="text-[12px] text-[var(--muted)]">{t('settings.backupDescription')}</p>
              </div>
            </button>
          </section>
        )}

        {/* Version */}
        <p className="text-center text-[12px] text-[var(--muted)]">
          v{__APP_VERSION__} ({__APP_BUILD_DATE__})
        </p>

        {/* Dev-only: Clear all data */}
        {IS_DEV && (
          <section className="space-y-[var(--space-2)]">
            <div className="flex items-center gap-2 px-1">
              <span className="font-[family:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--warn)] bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                {t('common.devOnly')}
              </span>
            </div>
            <button
              onClick={() => navigate('/settings/design-system')}
              className="w-full flex items-center gap-3 px-[var(--space-4)] py-[var(--space-4)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--fg)] active:bg-[var(--bg)] transition-colors"
            >
              <Palette className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left text-[15px] font-semibold">{t('settings.designSystem')}</span>
              <ChevronRight className="w-5 h-5 text-[var(--muted)] shrink-0" />
            </button>
            <button
              onClick={handleClear}
              disabled={clearAll.isPending}
              className={`w-full flex items-center gap-3 px-[var(--space-4)] py-[var(--space-4)] bg-[var(--surface)] border rounded-[var(--radius-lg)] transition-colors active:bg-[var(--bg)] ${
                confirming
                  ? 'border-[var(--danger)] text-[var(--danger)]'
                  : 'border-[var(--border)] text-[var(--fg)]'
              }`}
            >
              {confirming ? (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              ) : (
                <Trash2 className="w-5 h-5 shrink-0" />
              )}
              <span className="text-[15px] font-semibold">
                {clearAll.isPending
                  ? t('settings.clearing')
                  : confirming
                    ? t('settings.tapAgainClearAll')
                    : t('settings.clearAllData')}
              </span>
            </button>
          </section>
        )}

        <BottomSheet open={showPlayerPicker} onClose={() => setShowPlayerPicker(false)}>
          <div className="px-[var(--space-4)] pt-[var(--space-3)] pb-[var(--space-2)]">
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
              {t('settings.selectPlayer')}
            </p>
          </div>
          <div className="max-h-[50vh] overflow-y-auto pb-[var(--space-2)]">
            {players.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => handleLinkPlayer(player.id)}
                disabled={updatePlayerLink.isPending}
                className="w-full flex items-center gap-3 px-[var(--space-4)] py-3 active:bg-[var(--bg)] transition-colors"
              >
                <Avatar src={player.avatar_url} name={player.name} size={36} />
                <span className="flex-1 text-left text-[15px] font-semibold text-[var(--fg)] truncate">
                  {player.name}
                </span>
              </button>
            ))}
          </div>
        </BottomSheet>

        <Dialog
          open={confirmUnlinkOpen}
          onClose={() => setConfirmUnlinkOpen(false)}
          title={t('settings.unlinkConfirmTitle')}
          description={t('settings.unlinkConfirmDescription')}
          kind="warning"
          actions={[
            { label: t('common.cancel'), variant: 'secondary', onClick: () => setConfirmUnlinkOpen(false) },
            { label: updatePlayerLink.isPending ? t('common.saving') : t('settings.unlinkPlayer'), variant: 'danger', onClick: handleUnlinkPlayer },
          ]}
        />

        <Dialog
          open={linkErrorOpen}
          onClose={() => setLinkErrorOpen(false)}
          title={t('settings.linkFailedTitle')}
          description={t('settings.linkFailedDescription')}
          kind="danger"
        />
      </div>
    </div>
  )
}
