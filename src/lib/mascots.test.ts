import { describe, expect, it } from 'vitest'
import { getMascot, MASCOTS } from './mascots'

describe('getMascot', () => {
  it('returns null for null/undefined ids', () => {
    expect(getMascot(null)).toBeNull()
    expect(getMascot(undefined)).toBeNull()
  })

  it('returns null for an unknown id', () => {
    expect(getMascot('not-a-mascot')).toBeNull()
  })

  it('returns the matching mascot', () => {
    const fox = getMascot('fox')
    expect(fox).toEqual(MASCOTS.find(m => m.id === 'fox'))
    expect(fox?.emoji).toBe('🦊')
  })

  it('has unique ids', () => {
    const ids = MASCOTS.map(m => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
