import { describe, expect, it } from 'vitest'
import { getThumbnailSeekTargets } from './generateVideoThumbnail'

describe('getThumbnailSeekTargets', () => {
  it('tries an early frame before later fallback frames', () => {
    expect(getThumbnailSeekTargets(20)).toEqual([1, 7, 13])
  })

  it('keeps seek targets inside short videos and removes duplicates', () => {
    const targets = getThumbnailSeekTargets(0.2)
    expect(targets).toEqual([...new Set(targets)])
    expect(targets.every((target) => target >= 0 && target <= 0.1)).toBe(true)
  })

  it('uses the current frame when duration is unavailable', () => {
    expect(getThumbnailSeekTargets(Number.NaN)).toEqual([0])
  })
})
