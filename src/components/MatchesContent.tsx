import type { MatchWithDetails } from '../types/database'
import MatchCard from './MatchCard'
import { RotateCcw } from 'lucide-react'
import { useI18n } from '../i18n'

interface MatchesContentProps {
  matches: MatchWithDetails[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

function SkeletonCard() {
  return (
    <div
      className="p-4 animate-pulse"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="h-[8px] w-10 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-[8px] w-12 rounded" style={{ background: 'var(--border)' }} />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="h-[12px] w-[70%] rounded ml-auto" style={{ background: 'var(--border)' }} />
          <div className="h-[8px] w-[45%] rounded ml-auto opacity-60" style={{ background: 'var(--border)' }} />
        </div>
        <div className="h-[22px] w-[60px] rounded shrink-0" style={{ background: 'var(--border)' }} />
        <div className="flex-1 space-y-1.5">
          <div className="h-[12px] w-[70%] rounded" style={{ background: 'var(--border)' }} />
          <div className="h-[8px] w-[45%] rounded opacity-60" style={{ background: 'var(--border)' }} />
        </div>
      </div>
    </div>
  )
}

export default function MatchesContent({ matches, isLoading, isError, onRetry }: MatchesContentProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="space-y-[var(--space-3)]">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="py-10 px-4 text-center flex flex-col items-center gap-[var(--space-3)]"
        role="alert"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div
          className="w-14 h-14 grid place-items-center"
          style={{
            border: '1.5px solid var(--danger)',
            background: 'color-mix(in oklch, var(--danger) 8%, var(--surface))',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--danger)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
            <path d="M4 19h16a1 1 0 0 0 .87-1.5l-8-14a1 1 0 0 0-1.74 0l-8 14A1 1 0 0 0 4 19z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <div>
          <p className="text-[18px] font-extrabold tracking-[-0.02em] mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
            {t('matches.loadTitle')}
          </p>
          <p className="text-[13px] max-w-[260px] mx-auto" style={{ color: 'var(--muted)' }}>
            {t('matches.loadDescription')}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-[var(--space-2)] px-5 py-3 text-[13px] font-semibold min-h-[44px] active:opacity-70 transition-opacity"
          style={{
            background: 'var(--fg)',
            color: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            border: 'none',
          }}
        >
          <RotateCcw className="w-[14px] h-[14px]" />
          {t('common.retry')}
        </button>
      </div>
    )
  }

  if (!matches || matches.length === 0) {
    return null
  }

  const sortedByCreated = [...matches].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const numberMap = new Map<string, number>()
  sortedByCreated.forEach((m, i) => numberMap.set(m.id, i + 1))

  return (
    <div className="space-y-[var(--space-3)]">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          matchNumber={numberMap.get(match.id) ?? 0}
        />
      ))}
    </div>
  )
}
