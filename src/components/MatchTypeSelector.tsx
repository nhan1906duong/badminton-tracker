import { MATCH_TYPE_LABELS, type MatchType } from '../types/database'

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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Match Type</label>
      <div className="grid grid-cols-2 gap-2">
        {TYPES.map(type => (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`px-3 py-2.5 rounded-xl text-xs font-medium text-center border transition-colors ${
              value === type
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
            }`}
          >
            {MATCH_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  )
}
