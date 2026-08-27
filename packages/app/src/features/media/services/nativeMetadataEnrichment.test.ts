import { describe, expect, it, vi } from 'vitest'
import type { MediaAsset } from '../store/mediaStore'
import { scheduleNativeMetadataEnrichment } from './nativeMetadataEnrichment'

describe('native metadata enrichment', () => {
  it('runs available probes as deferred work and exposes codec metadata', async () => {
    const jobs: Array<() => Promise<void>> = []
    const updates: unknown[] = []
    const asset = createAsset()
    const result = await scheduleNativeMetadataEnrichment({
      assets: [asset],
      signal: new AbortController().signal,
      onAssetUpdate: (id, patch) => updates.push({ id, patch }),
    }, {
      queue: { enqueue: (job) => { jobs.push(job.run); return true } },
      getStatus: vi.fn(async () => ({ available: true })),
      probe: vi.fn(async () => ({ duration: 12, width: 1920, height: 1080, videoCodec: 'h264', audioCodec: 'aac' })),
    })

    expect(result).toEqual({ available: true, enqueued: 1 })
    await jobs[0]?.()
    expect(updates).toEqual([{ id: asset.id, patch: {
      duration: 12,
      width: 1920,
      height: 1080,
      videoCodec: 'h264',
      audioCodec: 'aac',
      mediaProbeStatus: 'ready',
    } }])
  })

  it('does no work when the optional probe is unavailable', async () => {
    const enqueue = vi.fn()
    const result = await scheduleNativeMetadataEnrichment({
      assets: [createAsset()],
      signal: new AbortController().signal,
      onAssetUpdate: vi.fn(),
    }, {
      queue: { enqueue },
      getStatus: vi.fn(async () => ({ available: false })),
      probe: vi.fn(),
    })

    expect(result).toEqual({ available: false, enqueued: 0 })
    expect(enqueue).not.toHaveBeenCalled()
  })
})

function createAsset(): MediaAsset {
  return {
    id: 'library/clip.mp4',
    libraryId: 'library',
    rootName: 'Videos',
    name: 'clip.mp4',
    extension: '.mp4',
    pathParts: [],
    source: { kind: 'desktop-path', absolutePath: 'C:\\Videos\\clip.mp4' },
    size: 10,
    lastModified: 1,
    thumbnailStatus: 'ready',
  }
}
