import type { Session } from '../types/database'
import { LOCALE_TAG, translate, type Locale } from '../i18n'

export function formatSessionDuration(startedAt: string, endedAt?: string | null, locale: Locale = 'en'): string {
  const start = new Date(startedAt)
  const now = new Date()
  if (!endedAt && start.getTime() > now.getTime()) {
    return translate(locale, 'common.notStarted')
  }

  const end = endedAt ? new Date(endedAt) : now
  const diffMs = end.getTime() - start.getTime()
  if (diffMs <= 0) {
    return translate(locale, 'common.notStarted')
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function formatSessionDateTime(startedAt: string, locale: Locale = 'en'): string {
  const d = new Date(startedAt)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tag = LOCALE_TAG[locale]
  const timeStr = d.toLocaleTimeString(tag, { hour: 'numeric', minute: '2-digit' })
  if (isToday) return `${translate(locale, 'common.today')} · ${timeStr}`
  return `${d.toLocaleDateString(tag, { month: 'short', day: 'numeric' })} · ${timeStr}`
}

export function getSessionName(session: Session, locale: Locale = 'en'): string {
  if (session.label) return session.label
  return new Date(session.started_at).toLocaleDateString(LOCALE_TAG[locale], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getSessionStatus(session: Session): 'active' | 'completed' | 'scheduled' {
  if (session.ended_at) return 'completed'
  if (new Date(session.started_at).getTime() > Date.now()) return 'scheduled'
  return 'active'
}
