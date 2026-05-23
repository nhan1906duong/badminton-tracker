import type { MatchType } from '../../src/types/database'

export interface MatchTypeChipsProps {
  value: MatchType
  onChange: (type: MatchType) => void
}

const CHIPS: { type: MatchType; code: string; tag: string }[] = [
  { type: 'MEN_SINGLES',    code: 'MS', tag: 'Men S.'  },
  { type: 'WOMEN_SINGLES',  code: 'WS', tag: 'Women S.' },
  { type: 'MEN_DOUBLES',    code: 'MD', tag: 'Men D.'  },
  { type: 'WOMEN_DOUBLES',  code: 'WD', tag: 'Women D.' },
  { type: 'MIXED_DOUBLES',  code: 'XD', tag: 'Mixed'   },
]

export function MatchTypeChips({ value, onChange }: MatchTypeChipsProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Match type"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-2)' }}
    >
      {CHIPS.map(({ type, code, tag }) => {
        const active = value === type
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(type)}
            style={{
              background: active ? 'var(--accent-soft)' : 'var(--surface)',
              border: `${active ? 2 : 1}px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: active
                ? 'calc(var(--space-3) - 1px) calc(var(--space-2) - 1px)'
                : 'var(--space-3) var(--space-2)',
              cursor: 'pointer',
              minHeight: 64,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              transition: 'border-color 0.15s, background 0.15s',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-lg)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                color: active ? 'var(--accent)' : 'var(--fg)',
              }}
            >
              {code}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: active ? 'var(--accent)' : 'var(--muted)',
                lineHeight: 1,
                opacity: active ? 0.8 : 1,
              }}
            >
              {tag}
            </span>
          </button>
        )
      })}
    </div>
  )
}
