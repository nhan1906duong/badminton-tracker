export function formatShortPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return parts[0] ?? ''

  const [firstName, ...rest] = parts
  const initials = rest.map((part) => `${part[0].toUpperCase()}.`)
  return [firstName, ...initials].join(' ')
}
