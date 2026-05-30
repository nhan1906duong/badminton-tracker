import type { SessionType } from '../types/database'
import { useI18n, type TranslationKey } from '../i18n'
import { Calendar, Trophy, Users } from 'lucide-react'

interface SessionTypePickerProps {
  value: SessionType
  onChange: (type: SessionType) => void
}

const TYPES: { type: SessionType; icon: React.ReactNode; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  {
    type: 'tournament',
    icon: <Trophy className="w-4 h-4" />,
    titleKey: 'createSession.typeTournament',
    descKey: 'createSession.typeTournamentDesc',
  },
  {
    type: 'regular',
    icon: <Calendar className="w-4 h-4" />,
    titleKey: 'createSession.typeRegular',
    descKey: 'createSession.typeRegularDesc',
  },
  {
    type: 'league',
    icon: <Users className="w-4 h-4" />,
    titleKey: 'createSession.typeLeague',
    descKey: 'createSession.typeLeagueDesc',
  },
]

export default function SessionTypePicker({ value, onChange }: SessionTypePickerProps) {
  const { t } = useI18n()

  return (
    <div
      className="grid grid-cols-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-[3px] relative"
      role="tablist"
      aria-label={t('createSession.selectType')}
    >
      {TYPES.map(({ type, icon, titleKey }) => {
        const isSelected = value === type
        return (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(type)}
            className={`relative z-10 flex min-h-[44px] items-center justify-center gap-1.5 rounded-[6px] px-2 font-[family:var(--font-body)] font-bold transition-colors ${
              isSelected
                ? 'bg-[var(--fg)] text-[var(--surface)]'
                : 'text-[var(--muted)] active:bg-[var(--bg)]'
            }`}
            style={{ fontSize: 12 }}
          >
            {icon}
            <span className="truncate">{t(titleKey)}</span>
          </button>
        )
      })}
    </div>
  )
}
