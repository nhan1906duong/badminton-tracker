/**
 * Deterministic default avatar from multiavatar.com.
 * Hashes a name to pick 1 of 10 default avatars consistently.
 */

import multiavatar from '@multiavatar/multiavatar'

export const DEFAULT_AVATAR_PREFIX = 'https://multiavatar.com/'

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export function getDefaultAvatarUrl(name: string): string {
  const id = (hashName(name) % 10) + 1
  return `${DEFAULT_AVATAR_PREFIX}${id}`
}

/**
 * Generate an SVG data URL from a multiavatar ID (1-10).
 * The multiavatar.com website renders SVGs via JS — the API is blocked (403).
 * We generate the SVG client-side using the @multiavatar/multiavatar package.
 */
export function getMultiavatarSvgUrl(id: string | number): string {
  const svg = multiavatar(String(id))
  const encoded = btoa(svg)
  return `data:image/svg+xml;base64,${encoded}`
}

/**
 * Check if a URL is a multiavatar default URL.
 */
export function isMultiavatarUrl(url: string): boolean {
  return url.startsWith(DEFAULT_AVATAR_PREFIX)
}

/**
 * Extract the multiavatar ID from a URL like https://multiavatar.com/1
 */
export function getMultiavatarId(url: string): string | null {
  if (!isMultiavatarUrl(url)) return null
  return url.slice(DEFAULT_AVATAR_PREFIX.length)
}
