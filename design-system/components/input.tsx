import type { InputHTMLAttributes, ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  rightAction?: ReactNode
}

export function Input({
  label,
  hint,
  error,
  rightAction,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-2"
          style={{ color: 'var(--muted)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`w-full px-4 py-3.5 text-[15px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] outline-none placeholder:text-[var(--muted)] placeholder:opacity-60 focus:border-[var(--fg)] focus:border-2 ${error ? 'border-[var(--danger)]' : ''} ${rightAction ? 'pr-12' : ''} ${className}`}
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--fg)',
            minHeight: 52,
            WebkitAppearance: 'none',
          }}
          {...props}
        />
        {rightAction && (
          <div className="absolute right-0 top-0 h-full flex items-center pr-3">
            {rightAction}
          </div>
        )}
      </div>
      {hint && !error && (
        <p className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-2 text-[11px]" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
