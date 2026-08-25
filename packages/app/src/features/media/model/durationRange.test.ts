import { describe, expect, it } from 'vitest'
import { describeDurationRange, getDurationBounds, matchesDurationRange, normalizeDurationRange } from './durationRange'

describe('duration ranges', () => {
  it('includes both user-selected boundaries', () => {
    expect(matchesDurationRange(300, { mode: 'known', minimumSeconds: 300, maximumSeconds: 600 })).toBe(true)
    expect(matchesDurationRange(600, { mode: 'known', minimumSeconds: 300, maximumSeconds: 600 })).toBe(true)
    expect(matchesDurationRange(600.1, { mode: 'known', minimumSeconds: 300, maximumSeconds: 600 })).toBe(false)
  })

  it('separates unknown durations from known ranges', () => {
    expect(matchesDurationRange(undefined, { mode: 'unknown' })).toBe(true)
    expect(matchesDurationRange(0, { mode: 'unknown' })).toBe(true)
    expect(matchesDurationRange(undefined, { mode: 'known', minimumSeconds: 0 })).toBe(false)
  })

  it('derives a rounded slider domain and describes selected ranges', () => {
    expect(getDurationBounds([undefined, 61.4, 605.2])).toEqual({ minimumSeconds: 61, maximumSeconds: 606 })
    expect(getDurationBounds([undefined, 0])).toBeNull()
    expect(describeDurationRange({ mode: 'known', minimumSeconds: 90, maximumSeconds: 330 })).toBe('1:30–5:30')
    expect(normalizeDurationRange({ mode: 'known', minimumSeconds: -1, maximumSeconds: 300 })).toEqual({ mode: 'known', maximumSeconds: 300 })
  })
})
