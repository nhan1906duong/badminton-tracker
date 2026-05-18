/**
 * Deterministic default avatar from multiavatar.com.
 * Hashes a name to pick 1 of 10 default avatars consistently.
 */

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export function getDefaultAvatarUrl(name: string): string {
  const id = (hashName(name) % 10) + 1
  return `https://api.multiavatar.com/${id}.png`
}
