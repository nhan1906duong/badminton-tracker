import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import Avatar from '../components/Avatar'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useI18n } from '../i18n'
import { AppBar } from '../../design-system/components/app-bar'

export default function AccountSettingPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { data: profile } = useProfile(user?.id)

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
      <AppBar
        title=''
        leftAction={{
          icon: <ChevronLeft className="w-5 h-5 -ml-1" />,
          onClick: () => navigate('/settings'),
        }}
      />

      <div
        className="flex-1 overflow-y-auto overscroll-contain px-[var(--space-5)] pt-[var(--space-2)] space-y-[var(--space-3)]"
        style={{ paddingBottom: 'max(var(--space-8), env(safe-area-inset-bottom))' }}
      >
        <section className="px-[var(--space-1)] py-[var(--space-2)] flex items-center gap-3">
          <Avatar
            src={profile?.avatar_url}
            name={user?.email || t('common.user')}
            size={48}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[var(--fg)] truncate">
              {user?.email || t('common.user')}
            </p>
            <p className="text-[13px] text-[var(--muted)]">{t('auth.signedIn')}</p>
          </div>
        </section>

        <section className="space-y-[var(--space-2)]">
          <button
            type="button"
            onClick={() => navigate('/settings/account/change-password')}
            className="w-full flex items-center gap-3 px-[var(--space-1)] py-[var(--space-3)] text-[var(--fg)] active:opacity-60 transition-opacity"
          >
            <Lock className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left text-[15px] font-semibold">{t('account.changePassword')}</span>
            <ChevronRight className="w-5 h-5 text-[var(--muted)] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex px-[var(--space-1)] py-[var(--space-3)] text-[var(--danger)] active:opacity-60 transition-opacity"
          >
            <span className="text-[15px] font-semibold">{t('account.logOut')}</span>
          </button>
        </section>
      </div>

    </div>
  )
}
