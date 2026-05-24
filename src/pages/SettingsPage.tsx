import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useClearAllData, useRecalculateAllRatings } from '../hooks/useSessions'
import { LogOut, Trash2, AlertTriangle, Palette, ChevronRight, Camera, RefreshCw, Info, Languages, User, X } from 'lucide-react'
import Avatar from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'
import { useAvatarUpload, useAvatarDelete, useSetDefaultAvatar } from '../hooks/useAvatarUpload'
import { useProfile, useUpdatePlayerLink } from '../hooks/useProfile'
import { usePlayers } from '../hooks/usePlayers'
import { useI18n, type Locale } from '../i18n'
import { BottomSheet } from '../../design-system/components'

const IS_DEV = import.meta.env.DEV

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { locale, setLocale, t } = useI18n()
  const clearAll = useClearAllData()
  const recalculate = useRecalculateAllRatings()
  const [confirming, setConfirming] = useState(false)
  const [confirmRecalc, setConfirmRecalc] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const { data: profile } = useProfile(user?.id)
  const upload = useAvatarUpload()
  const remove = useAvatarDelete()
  const setDefault = useSetDefaultAvatar()
  const updatePlayerLink = useUpdatePlayerLink()
  const { data: players = [] } = usePlayers()
  const [showPlayerPicker, setShowPlayerPicker] = useState(false)

  const userAvatarUrl = profile?.avatar_url
  const linkedPlayer = profile?.player_id ? players.find((p) => p.id === profile.player_id) : null

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

  return (
    <div className="min-h-svh bg-[var(--bg)]">
      <div className="px-[var(--space-5)] py-[var(--space-5)] space-y-[var(--space-3)] pb-32">
        {/* User profile */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-[var(--space-4)] flex items-center gap-3">
          <button
            onClick={() => setShowPicker(true)}
            className="relative shrink-0"
            disabled={upload.isPending}
          >
            <Avatar
              src={userAvatarUrl}
              name={user?.email || t('common.user')}
              size={48}
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[var(--accent)] rounded-full flex items-center justify-center border-2 border-[var(--surface)]">
              <Camera className="w-3 h-3 text-[var(--surface)]" />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[var(--fg)] truncate">
              {user?.email || t('common.user')}
            </p>
            <p className="text-[13px] text-[var(--muted)]">{t('auth.signedIn')}</p>
          </div>
        </section>

        {/* Avatar Picker */}
        {showPicker && user && (
          <AvatarPicker
            currentAvatarUrl={userAvatarUrl}
            onSelect={(file) => upload.mutate({ file, entity: 'users', id: user.id })}
            onSelectDefault={(url) => setDefault.mutate({ url, entity: 'users', id: user.id, oldAvatarUrl: userAvatarUrl })}
            onRemove={() => remove.mutate({ entity: 'users', id: user.id, oldAvatarUrl: userAvatarUrl })}
            onClose={() => setShowPicker(false)}
          />
        )}

        {/* Your Player Profile */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
          <div className="px-[var(--space-4)] pt-[var(--space-4)] pb-[var(--space-2)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
              {t('settings.yourPlayer')}
            </p>
          </div>
          {linkedPlayer ? (
            <div className="flex items-center gap-3 px-[var(--space-4)] pb-[var(--space-4)]">
              <Avatar src={linkedPlayer.avatar_url} name={linkedPlayer.name} size={36} />
              <span className="flex-1 text-[15px] font-semibold text-[var(--fg)] truncate">
                {linkedPlayer.name}
              </span>
              <button
                onClick={() => user && updatePlayerLink.mutate({ userId: user.id, playerId: null })}
                disabled={updatePlayerLink.isPending}
                className="text-[13px] font-semibold text-[var(--danger)] active:opacity-60 transition-opacity flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                {t('settings.unlinkPlayer')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPlayerPicker(true)}
              className="w-full flex items-center gap-3 px-[var(--space-4)] pb-[var(--space-4)] active:opacity-60 transition-opacity"
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

        {/* Player picker bottom sheet */}
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
                onClick={() => {
                  if (!user) return
                  updatePlayerLink.mutate({ userId: user.id, playerId: player.id })
                  setShowPlayerPicker(false)
                }}
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

        {/* Actions */}
        <section className="space-y-[var(--space-2)]">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-[var(--space-4)]">
            <div className="flex items-center gap-3 mb-3">
              <Languages className="w-5 h-5 shrink-0 text-[var(--fg)]" />
              <span className="flex-1 text-left text-[15px] font-semibold text-[var(--fg)]">{t('settings.language')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['en', 'vi'] as Locale[]).map((option) => {
                const active = locale === option
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setLocale(option)}
                    className={`min-h-[42px] rounded-[var(--radius-md)] border text-[14px] font-semibold transition-colors ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--bg)] text-[var(--fg)]'
                    }`}
                  >
                    {option === 'en' ? t('settings.languageEnglish') : t('settings.languageVietnamese')}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={() => navigate('/settings/points')}
            className="w-full flex items-center gap-3 px-[var(--space-4)] py-[var(--space-4)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--fg)] active:bg-[var(--bg)] transition-colors"
          >
            <Info className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left text-[15px] font-semibold">{t('settings.howPointsWork')}</span>
            <ChevronRight className="w-5 h-5 text-[var(--muted)] shrink-0" />
          </button>

          <button
            onClick={handleRecalculate}
            disabled={recalculate.isPending}
            className={`w-full flex items-center gap-3 px-[var(--space-4)] py-[var(--space-4)] bg-[var(--surface)] border rounded-[var(--radius-lg)] transition-colors active:bg-[var(--bg)] ${
              confirmRecalc
                ? 'border-[var(--warn)] text-[var(--warn)]'
                : 'border-[var(--border)] text-[var(--fg)]'
            }`}
          >
            {confirmRecalc ? (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            ) : (
              <RefreshCw className={`w-5 h-5 shrink-0 ${recalculate.isPending ? 'animate-spin' : ''}`} />
            )}
            <span className="text-[15px] font-semibold">
              {recalculate.isPending
                ? t('settings.recalculating')
                : confirmRecalc
                  ? t('settings.tapAgainRecalculate')
                  : t('settings.recalculateAllRatings')}
            </span>
          </button>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-[var(--space-4)] py-[var(--space-4)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--danger)] active:bg-[var(--bg)] transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[15px] font-semibold">{t('settings.logOut')}</span>
          </button>
        </section>

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
      </div>
    </div>
  )
}
