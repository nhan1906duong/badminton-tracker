import { LOCALE_TAG, type Locale } from '../i18n'
import type { Session } from '../types/database'

export function formatSessionLabel(session: Session, locale: Locale): string {
  return (
    session.label ??
    new Date(session.started_at).toLocaleDateString(LOCALE_TAG[locale], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  )
}
