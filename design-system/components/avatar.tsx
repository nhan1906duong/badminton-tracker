import { useState } from 'react'
import { isMultiavatarUrl, getMultiavatarSvgUrl } from '../../src/lib/avatar'

export interface AvatarProps {
  src?: string | null
  name: string
  size?: number
  className?: string
  bgColor?: string
  textColor?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function resolveAvatarUrl(url: string): string {
  if (isMultiavatarUrl(url)) {
    const id = url.split('/').pop()
    if (id) return getMultiavatarSvgUrl(id)
  }
  return url
}

export function Avatar({
  src,
  name,
  size = 40,
  className = '',
  bgColor = 'var(--accent)',
  textColor = 'var(--surface)',
}: AvatarProps) {
  const [errorForSrc, setErrorForSrc] = useState<string | null>(null)
  const imageUrl = src ? resolveAvatarUrl(src) : null
  const hasError = !imageUrl || errorForSrc === src

  return (
    <div
      className={`flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-md)',
        backgroundColor: hasError ? bgColor : undefined,
        color: textColor,
        fontSize: size * 0.33,
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: '-0.01em',
      }}
    >
      {hasError ? (
        getInitials(name)
      ) : (
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setErrorForSrc(src ?? null)}
          draggable={false}
        />
      )}
    </div>
  )
}
