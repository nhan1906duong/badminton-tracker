export interface BwfCategoryBadgeProps {
  categoryName: string
  categorySlug: string
  className?: string
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  'grade-2-level-1': {
    label: 'Finals',
    color: 'oklch(55% 0.20 300)',
    bg: 'oklch(55% 0.20 300 / 0.12)',
  },
  'grade-2-level-2': {
    label: 'S1000',
    color: 'oklch(60% 0.16 85)',
    bg: 'oklch(60% 0.16 85 / 0.15)',
  },
  'grade-2-level-3': {
    label: 'S750',
    color: 'oklch(55% 0.20 25)',
    bg: 'oklch(55% 0.20 25 / 0.12)',
  },
  'grade-2-level-4': {
    label: 'S500',
    color: 'oklch(55% 0.16 250)',
    bg: 'oklch(55% 0.16 250 / 0.12)',
  },
  'grade-2-level-5': {
    label: 'S300',
    color: 'oklch(50% 0.14 145)',
    bg: 'oklch(50% 0.14 145 / 0.12)',
  },
  'grade-2-level-6': {
    label: 'S100',
    color: 'oklch(50% 0.01 50)',
    bg: 'oklch(50% 0.01 50 / 0.12)',
  },
}

export function BwfCategoryBadge({ categorySlug, className = '' }: BwfCategoryBadgeProps) {
  const meta = CATEGORY_META[categorySlug]
  if (!meta) return null

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] leading-none border ${className}`}
      style={{
        color: meta.color,
        background: meta.bg,
        borderColor: meta.color,
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {meta.label}
    </span>
  )
}
