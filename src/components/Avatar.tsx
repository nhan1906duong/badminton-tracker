import { useState } from 'react'
import { getDefaultAvatarUrl } from '../lib/avatar'

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

export default function Avatar({
  src,
  name,
  size = 40,
  className = '',
  bgColor = '#e5e7eb',
  textColor = '#6b7280',
}: AvatarProps) {
  const [error, setError] = useState(false)
  const showImage = src && !error
  const defaultUrl = getDefaultAvatarUrl(name)

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: showImage ? undefined : bgColor,
        color: textColor,
        fontSize: size * 0.4,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
          draggable={false}
        />
      ) : error ? (
        getInitial(name)
      ) : (
        <img
          src={defaultUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
          draggable={false}
        />
      )}
    </div>
  )
}
