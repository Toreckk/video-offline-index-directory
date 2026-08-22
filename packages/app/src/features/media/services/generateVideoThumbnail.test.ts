import { describe, expect, it } from 'vitest'
import { getThumbnailSeekTargets, setCanvasSafeMediaSource } from './generateVideoThumbnail'

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

describe('setCanvasSafeMediaSource', () => {
  it('opts into CORS before loading an asset-protocol video', () => {
    const changes: string[] = []
    let crossOrigin = ''
    let src = ''
    const video = {
      get crossOrigin() {
        return crossOrigin
      },
      set crossOrigin(value: string | null) {
        crossOrigin = value ?? ''
        changes.push(`crossOrigin:${value}`)
      },
      get src() {
        return src
      },
      set src(value: string) {
        src = value
        changes.push(`src:${value}`)
      },
    }

    setCanvasSafeMediaSource(video, 'http://asset.localhost/C%3A/video.mp4')

    expect(changes).toEqual([
      'crossOrigin:anonymous',
      'src:http://asset.localhost/C%3A/video.mp4',
    ])
  })
})
