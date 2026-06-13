import { Crown, Medal } from 'lucide-react'
import { BwfCategoryBadge, SectionLabel } from '../../design-system/components'
import { CATEGORY_ICON, CATEGORY_COLOR } from '../lib/badge-categories'
import { formatSessionLabel } from '../lib/session-label'
import { useI18n, type Locale } from '../i18n'
import type { PlayerAchievement } from '../hooks/usePlayerAchievements'
import type { PlayerBadge } from '../hooks/usePlayerBadges'

interface Props {
  achievements: PlayerAchievement[]
  badges: PlayerBadge[]
  locale: Locale
  isLoading: boolean
  onSessionClick: (sessionId: string) => void
}

export function PlayerOverviewCard({ achievements, badges, locale, isLoading, onSessionClick }: Props) {
  const { t } = useI18n()

  if (isLoading) return null

  const champions = achievements.filter((a) => a.type === 'win')
  const runnerUps = achievements.filter((a) => a.type === 'runner_up')

  if (champions.length === 0 && runnerUps.length === 0 && badges.length === 0) return null

  return (
    <div
      className="page-enter-left relative overflow-hidden"
      style={{ 
        borderRadius: 'var(--radius-lg)',
        marginTop: 0,
        animationDuration: '1000ms',
      }}
    >
      <div className="relative flex flex-col" style={{ paddingBlock: 'var(--space-4)', paddingInline: 'var(--space-2)', gap: 'var(--space-3)' }}>
        {champions.length > 0 && (
          <OverviewSection label={t('players.overviewChampion')}>
            {champions.map((a) => (
              <SessionRow key={a.session.id} achievement={a} locale={locale} icon={<Crown size={14} style={{ color: '#D4A843', flexShrink: 0 }} />} onClick={() => onSessionClick(a.session.id)} />
            ))}
          </OverviewSection>
        )}

        {runnerUps.length > 0 && (
          <OverviewSection label={t('players.overviewRunnerUp')}>
            {runnerUps.map((a) => (
              <SessionRow key={a.session.id} achievement={a} locale={locale} icon={<Medal size={14} style={{ color: '#B0B0B0', flexShrink: 0 }} />} onClick={() => onSessionClick(a.session.id)} />
            ))}
          </OverviewSection>
        )}

        {badges.length > 0 && (
          <OverviewSection label={t('players.overviewAwards')}>
            {badges.map((badge) => {
              const Icon = CATEGORY_ICON[badge.category]
              const color = CATEGORY_COLOR[badge.category]
              return (
                <div key={badge.id} className="flex items-center gap-2">
                  <Icon size={14} strokeWidth={2.5} style={{ color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--fg)' }}>
                    {t(badge.labelKey, { count: badge.count })}
                  </span>
                </div>
              )
            })}
          </OverviewSection>
        )}
      </div>
    </div>
  )
}

function OverviewSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
        {children}
      </div>
    </div>
  )
}

function SessionRow({
  achievement,
  locale,
  icon,
  onClick,
}: {
  achievement: PlayerAchievement
  locale: Locale
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 min-w-0 active:opacity-70 transition-opacity text-left">
      {icon}
      <span
        className="truncate"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--fg)' }}
      >
        {formatSessionLabel(achievement.session, locale)}
      </span>
      {achievement.session.bwf_tournaments && (
        <BwfCategoryBadge
          categoryName={achievement.session.bwf_tournaments.category_name}
          categorySlug={achievement.session.bwf_tournaments.category_slug}
        />
      )}
    </button>
  )
}
