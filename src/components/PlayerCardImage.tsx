import { isMultiavatarUrl } from '../lib/avatar'
import Avatar from './Avatar'

interface PlayerCardImageProps {
  avatarUrl?: string | null
  name: string
}

/**
 * Hero background art for PlayerDetailPage. Shows a 5:4 crop of the
 * player's avatar, fading into the page background on the left edge.
 * Falls back to the dim circular avatar watermark for default
 * multiavatar icons or when no avatar is set.
 */
export function PlayerCardImage({ avatarUrl, name }: PlayerCardImageProps) {
  if (avatarUrl && !isMultiavatarUrl(avatarUrl)) {
    return (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60%',
          aspectRatio: '5 / 4',
          maskImage: 'linear-gradient(90deg, transparent, black 35%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, black 35%)',
        }}
      >
        <img
          src={avatarUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        />
      </div>
    )
  }

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        right: '-8.3333%',
        width: '66.6667%',
        aspectRatio: '1 / 1',
        opacity: 0.12,
        maskImage: 'linear-gradient(225deg, black 30%, transparent 90%)',
        WebkitMaskImage: 'linear-gradient(225deg, black 30%, transparent 90%)',
      }}
    >
      <Avatar src={avatarUrl} name={name} size={220} className="!w-full !h-full" />
    </div>
  )
}
