import { useState } from 'react'
import { getDefaultAvatarUrl, isMultiavatarUrl, getMultiavatarSvgUrl } from '../lib/avatar'

interface AvatarProps {
  src?: string | null
  name: string
  size?: number
  className?: string
  bgColor?: string
  textColor?: string
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

function resolveAvatarUrl(url: string): string {
  if (isMultiavatarUrl(url)) {
    const id = url.split('/').pop()
    if (id) return getMultiavatarSvgUrl(id)
  }
  return url
}

export default function Avatar({
  src,
  name,
  size = 40,
  className = '',
  bgColor = '#e5e7eb',
  textColor = '#6b7280',
}: AvatarProps) {
  const [error, setError] = useState(false)
  const imageUrl = src ? resolveAvatarUrl(src) : resolveAvatarUrl(getDefaultAvatarUrl(name))
  const hasError = error || !imageUrl

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: hasError ? bgColor : undefined,
        color: textColor,
        fontSize: size * 0.4,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {hasError ? (
        getInitial(name)
      ) : (
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
          draggable={false}
        />
      )}
    </div>
  )
}
