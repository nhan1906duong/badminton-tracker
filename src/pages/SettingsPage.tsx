import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useClearAllData, useRecalculateAllRatings } from '../hooks/useSessions'
import { LogOut, Trash2, AlertTriangle, Palette, ChevronRight, Camera, RefreshCw, Info } from 'lucide-react'
import Avatar from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'
import { useAvatarUpload, useAvatarDelete, useSetDefaultAvatar } from '../hooks/useAvatarUpload'
import { useProfile } from '../hooks/useProfile'

const IS_DEV = import.meta.env.DEV

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const clearAll = useClearAllData()
  const recalculate = useRecalculateAllRatings()
  const [confirming, setConfirming] = useState(false)
  const [confirmRecalc, setConfirmRecalc] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const { data: profile } = useProfile(user?.id)
  const upload = useAvatarUpload()
  const remove = useAvatarDelete()
  const setDefault = useSetDefaultAvatar()

  const userAvatarUrl = profile?.avatar_url

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
              name={user?.email || 'User'}
              size={48}
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[var(--accent)] rounded-full flex items-center justify-center border-2 border-[var(--surface)]">
              <Camera className="w-3 h-3 text-[var(--surface)]" />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[var(--fg)] truncate">
              {user?.email || 'User'}
            </p>
            <p className="text-[13px] text-[var(--muted)]">Signed in</p>
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

        {/* Actions */}
        <section className="space-y-[var(--space-2)]">
          <button
            onClick={() => navigate('/settings/points')}
            className="w-full flex items-center gap-3 px-[var(--space-4)] py-[var(--space-4)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--fg)] active:bg-[var(--bg)] transition-colors"
          >
            <Info className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left text-[15px] font-semibold">How Points Work</span>
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
                ? 'Recalculating...'
                : confirmRecalc
                  ? 'Tap again to recalculate all ratings'
                  : 'Recalculate All Ratings'}
            </span>
          </button>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-[var(--space-4)] py-[var(--space-4)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--danger)] active:bg-[var(--bg)] transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[15px] font-semibold">Log Out</span>
          </button>
        </section>

        {/* Dev-only: Clear all data */}
        {IS_DEV && (
          <section className="space-y-[var(--space-2)]">
            <div className="flex items-center gap-2 px-1">
              <span className="font-[family:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--warn)] bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                Dev Only
              </span>
            </div>
            <button
              onClick={() => navigate('/settings/design-system')}
              className="w-full flex items-center gap-3 px-[var(--space-4)] py-[var(--space-4)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--fg)] active:bg-[var(--bg)] transition-colors"
            >
              <Palette className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left text-[15px] font-semibold">Design System</span>
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
                  ? 'Clearing...'
                  : confirming
                    ? 'Tap again to confirm clear all'
                    : 'Clear All Data & Avatars'}
              </span>
            </button>
          </section>
        )}
      </div>
    </div>
  )
}
