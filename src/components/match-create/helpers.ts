import { LOCALE_TAG, type Locale, type TFunction } from '../../i18n'

// Date/time helpers shared across the match-create flow.

export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function toTimeInput(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function friendlyDate(d: Date, locale: Locale, t: TFunction): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tom = new Date(today); tom.setDate(tom.getDate() + 1)
  const day0 = new Date(d); day0.setHours(0, 0, 0, 0)
  if (day0.getTime() === today.getTime()) return t('common.today')
  if (day0.getTime() === tom.getTime()) return t('common.tomorrow')
  return d.toLocaleDateString(LOCALE_TAG[locale], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function friendlyTime(d: Date, locale: Locale): string {
  return d.toLocaleTimeString(LOCALE_TAG[locale], { hour: 'numeric', minute: '2-digit' })
}

export function roundedSoon(addMin: number): Date {
  const d = new Date()
  d.setMinutes(d.getMinutes() + addMin)
  const m = d.getMinutes()
  d.setMinutes(Math.ceil(m / 15) * 15, 0, 0)
  return d
}
