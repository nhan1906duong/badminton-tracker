import { MATCH_TYPE_LABELS, type MatchType } from '../types/database'
import { ChevronDown } from 'lucide-react'

interface MatchTypeSelectorProps {
  value: MatchType
  onChange: (type: MatchType) => void
}

const TYPES: MatchType[] = [
  'MEN_SINGLES',
  'WOMEN_SINGLES',
  'MEN_DOUBLES',
  'WOMEN_DOUBLES',
  'MIXED_DOUBLES',
]

export default function MatchTypeSelector({ value, onChange }: MatchTypeSelectorProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value as MatchType)}
        className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3.5 pr-10 text-[15px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent active:bg-gray-50"
        style={{ minHeight: 52 }}
      >
        {TYPES.map(type => (
          <option key={type} value={type}>
            {MATCH_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <ChevronDown className="w-5 h-5" />
      </div>
    </div>
  )
}
