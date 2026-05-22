import type { Session } from '../types/database'

export function formatSessionDuration(startedAt: string, endedAt?: string | null): string {
  const start = new Date(startedAt)
  const end = endedAt ? new Date(endedAt) : new Date()
  const diffMs = end.getTime() - start.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function formatSessionDateTime(startedAt: string): string {
  const d = new Date(startedAt)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (isToday) return `Today · ${timeStr}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${timeStr}`
}

export function getSessionName(session: Session): string {
  if (session.label) return session.label
  return new Date(session.started_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getSessionStatus(session: Session): 'active' | 'completed' {
  return session.ended_at ? 'completed' : 'active'
}
