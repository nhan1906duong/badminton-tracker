import { describe, expect, it } from 'vitest'
import type { Session } from '../types/database'
import { formatSessionLabel } from './session-label'

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    type: 'regular',
    started_at: '2026-03-15T10:00:00Z',
    created_by: 'u1',
    created_at: '2026-03-15T10:00:00Z',
    ...overrides,
  }
}

describe('formatSessionLabel', () => {
  it('returns the session label when set', () => {
    expect(formatSessionLabel(session({ label: 'Spring Open' }), 'en')).toBe('Spring Open')
  })

  it('falls back to the formatted start date when label is null', () => {
    expect(formatSessionLabel(session({ label: null }), 'en')).toBe('Mar 15, 2026')
  })

  it('falls back to the formatted start date when label is undefined', () => {
    expect(formatSessionLabel(session(), 'en')).toBe('Mar 15, 2026')
  })

  it('formats the fallback date using the Vietnamese locale', () => {
    expect(formatSessionLabel(session({ label: null }), 'vi')).toBe('15 thg 3, 2026')
  })
})
