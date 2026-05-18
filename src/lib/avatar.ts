/**
 * Multiavatar utilities for the 10 selectable default avatars.
 */

import multiavatar from '@multiavatar/multiavatar'

export const DEFAULT_AVATAR_PREFIX = 'https://multiavatar.com/'

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
