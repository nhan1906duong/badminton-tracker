import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
  size?: 'sm' | 'default' | 'lg' | 'block'
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'default',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-semibold leading-none cursor-pointer active:opacity-70 transition-opacity duration-[var(--duration-fast)] select-none'

  const variantStyles: Record<string, string> = {
    primary:
      'bg-[var(--fg)] text-[var(--surface)] border-2 border-[var(--fg)]',
    secondary:
      'bg-transparent text-[var(--fg)] border-2 border-[var(--fg)]',
    ghost:
      'bg-transparent text-[var(--muted)] border border-[var(--border)]',
    accent:
      'bg-[var(--accent)] text-[var(--surface)] border-2 border-[var(--accent)]',
    danger:
      'bg-[var(--danger)] text-[var(--surface)] border-2 border-[var(--danger)]',
  }

  const sizeStyles: Record<string, string> = {
    sm: 'px-3 py-2 text-[13px]',
    default: 'px-4 py-3 text-[15px]',
    lg: 'px-6 py-3 text-[18px]',
    block: 'px-4 py-3 text-[15px] w-full',
  }

  const radiusStyle = 'rounded-[var(--radius-sm)]'

  return (
    <button
      type="button"
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${radiusStyle} ${className}`}
      style={{ minHeight: size === 'sm' ? 36 : 52, touchAction: 'manipulation' }}
      {...props}
    >
      {children}
    </button>
  )
}
