import type { LucideIcon } from 'lucide-react'
import { Trophy, Flame, Zap, Crown, Coins } from 'lucide-react'
import type { BadgeCategory } from '../hooks/usePlayerBadges'

export const CATEGORY_ICON: Record<BadgeCategory, LucideIcon> = {
  played: Trophy,
  streak: Flame,
  dynasty: Zap,
  titles: Crown,
  donated: Coins,
}

export const CATEGORY_COLOR: Record<BadgeCategory, string> = {
  played: 'var(--info)',
  streak: 'var(--danger)',
  dynasty: 'color-mix(in oklch, var(--warn) 80%, var(--fg))',
  titles: 'var(--accent)',
  donated: 'var(--success)',
}
