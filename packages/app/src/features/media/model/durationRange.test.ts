import { describe, expect, it } from 'vitest'
import { describeDurationRange, durationPresetKey, matchesDurationRange, normalizeDurationRange } from './durationRange'

describe('duration ranges', () => {
  it('keeps adjacent preset boundaries non-overlapping', () => {
    expect(matchesDurationRange(299.9, { mode: 'known', maximumSeconds: 300 })).toBe(true)
    expect(matchesDurationRange(300, { mode: 'known', maximumSeconds: 300 })).toBe(false)
    expect(matchesDurationRange(300, { mode: 'known', minimumSeconds: 300, maximumSeconds: 900 })).toBe(true)
  })

  it('separates unknown durations from known ranges', () => {
    expect(matchesDurationRange(undefined, { mode: 'unknown' })).toBe(true)
    expect(matchesDurationRange(0, { mode: 'unknown' })).toBe(true)
    expect(matchesDurationRange(undefined, { mode: 'known', minimumSeconds: 0 })).toBe(false)
  })

  it('recognizes presets and describes custom ranges', () => {
    expect(durationPresetKey({ mode: 'known', minimumSeconds: 3600 })).toBe('60-plus')
    expect(describeDurationRange({ mode: 'known', minimumSeconds: 90, maximumSeconds: 330 })).toBe('1.5–5.5 min')
    expect(normalizeDurationRange({ mode: 'known', minimumSeconds: -1, maximumSeconds: 300 })).toEqual({ mode: 'known', maximumSeconds: 300 })
  })
})
