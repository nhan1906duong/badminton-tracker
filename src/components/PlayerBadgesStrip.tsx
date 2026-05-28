import type { LucideIcon } from 'lucide-react'
import { Trophy, Flame, Zap, Crown, Coins } from 'lucide-react'
import type { PlayerBadge, BadgeCategory } from '../hooks/usePlayerBadges'
import { useI18n } from '../i18n'

const CATEGORY_ICON: Record<BadgeCategory, LucideIcon> = {
  played: Trophy,
  streak: Flame,
  dynasty: Zap,
  titles: Crown,
  donated: Coins,
}

const CATEGORY_COLOR: Record<BadgeCategory, string> = {
  played: 'var(--info)',
  streak: 'var(--danger)',
  dynasty: 'color-mix(in oklch, var(--warn) 80%, var(--fg))',
  titles: 'var(--accent)',
  donated: 'var(--success)',
}

interface Props {
  badges: PlayerBadge[]
  isLoading: boolean
}

export function PlayerBadgesStrip({ badges, isLoading }: Props) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-4 w-32 animate-pulse"
            style={{ background: 'var(--border)', borderRadius: 'var(--radius-md)' }}
          />
        ))}
      </div>
    )
  }

  if (badges.length === 0) return null

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
      {badges.map((badge) => {
        const Icon = CATEGORY_ICON[badge.category]
        const color = CATEGORY_COLOR[badge.category]
        return (
          <div key={badge.id} className="flex items-center" style={{ gap: 'var(--space-2)' }}>
            <Icon size={13} strokeWidth={2.5} style={{ color, flexShrink: 0 }} />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 400,
                color: 'var(--fg)',
              }}
            >
              {badge.count} {t(badge.labelKey)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
