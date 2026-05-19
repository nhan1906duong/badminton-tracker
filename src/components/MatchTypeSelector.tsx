import { useState, useRef, useEffect } from 'react'
import { MATCH_TYPE_LABELS, type MatchType } from '../types/database'
import { ChevronDown, Check } from 'lucide-react'

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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      <div className="flex items-center gap-1">
        <span className="text-[15px] font-medium text-gray-900">
          {MATCH_TYPE_LABELS[value]}
        </span>
        <button
          onClick={() => setOpen(v => !v)}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Change match type"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[180px] py-1">
          {TYPES.map(type => (
            <button
              key={type}
              onClick={() => {
                onChange(type)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2.5 text-[15px] flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors ${
                type === value ? 'text-green-700 font-semibold bg-green-50/50' : 'text-gray-700'
              }`}
            >
              {MATCH_TYPE_LABELS[type]}
              {type === value && <Check className="w-4 h-4 text-green-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
