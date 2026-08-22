import { describe, expect, it, vi } from 'vitest'
import type { MediaAsset } from '../store/mediaStore'
import {
  scheduleThumbnailEnrichment,
  type ThumbnailEnrichmentDependencies,
  type ThumbnailEnrichmentQueue,
} from './thumbnailEnrichmentPipeline'
import type { ThumbnailJob } from './thumbnailQueue'

describe('scheduleThumbnailEnrichment', () => {
  it('generates and caches a missing thumbnail', async () => {
    const queue = new ManualQueue()
    const updates: Array<{ id: string; status: string | undefined }> = []
    const dependencies = createDependencies(queue)
    const processed = vi.fn()

    const result = scheduleThumbnailEnrichment({
      assets: [asset],
      signal: new AbortController().signal,
      onAssetsQueued: (patches) => {
        expect(patches).toEqual([{ id: asset.id, patch: { thumbnailStatus: 'queued' } }])
      },
      onAssetUpdate: (id, patch) => updates.push({ id, status: patch.thumbnailStatus }),
      onProcessed: processed,
    }, dependencies)
    await queue.runNext()

    expect(result.enqueued).toBe(1)
    expect(dependencies.generateThumbnail).toHaveBeenCalledOnce()
    expect(dependencies.writeThumbnail).toHaveBeenCalledWith('key:video', expect.any(Blob))
    expect(updates).toEqual([{ id: asset.id, status: 'ready' }])
    expect(processed).toHaveBeenCalledWith(asset)
  })

  it('reuses a cached thumbnail and enriches missing metadata', async () => {
    const queue = new ManualQueue()
    const dependencies = createDependencies(queue)
    dependencies.readCachedThumbnail = vi.fn(async () => new Blob(['cached']))
    const update = vi.fn()

    scheduleThumbnailEnrichment({
      assets: [asset],
      signal: new AbortController().signal,
      onAssetUpdate: update,
    }, dependencies)
    await queue.runNext()

    expect(dependencies.generateThumbnail).not.toHaveBeenCalled()
    expect(dependencies.readMetadata).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledWith(asset.id, expect.objectContaining({
      thumbnailBlobKey: 'key:video',
      thumbnailStatus: 'ready',
      duration: 12,
    }))
  })

  it('defers a later-frame refinement for a dark first result', async () => {
    const queue = new ManualQueue()
    const dependencies = createDependencies(queue)
    dependencies.generateThumbnail = vi.fn(async () => thumbnailResult(true))
    const update = vi.fn()
    const refinementsComplete = vi.fn()

    scheduleThumbnailEnrichment({
      assets: [asset],
      signal: new AbortController().signal,
      onAssetUpdate: update,
      onRefinementsComplete: refinementsComplete,
    }, dependencies)
    await queue.runNext()
    expect(queue.jobs).toHaveLength(1)
    expect(queue.jobs[0]?.priority).toBe('deferred')
    await queue.runNext()

    expect(dependencies.generateRefinedThumbnail).toHaveBeenCalledOnce()
    expect(dependencies.writeThumbnail).toHaveBeenLastCalledWith(
      'key:video:refined',
      expect.any(Blob),
    )
    expect(update).toHaveBeenLastCalledWith(asset.id, expect.objectContaining({
      thumbnailBlobKey: 'key:video:refined',
    }))
    expect(refinementsComplete).toHaveBeenCalledOnce()
  })

  it('isolates thumbnail errors and marks the asset failed', async () => {
    const queue = new ManualQueue()
    const dependencies = createDependencies(queue)
    dependencies.generateThumbnail = vi.fn(async () => {
      throw new Error('decoder failed')
    })
    const diagnostic = vi.fn()
    const update = vi.fn()
    const processed = vi.fn()

    scheduleThumbnailEnrichment({
      assets: [asset],
      signal: new AbortController().signal,
      onAssetUpdate: update,
      onDiagnostic: diagnostic,
      onProcessed: processed,
    }, dependencies)
    await queue.runNext()

    expect(diagnostic).toHaveBeenCalledWith({ asset, error: expect.any(Error) })
    expect(update).toHaveBeenCalledWith(asset.id, { thumbnailStatus: 'error' })
    expect(processed).toHaveBeenCalledOnce()
  })
})

class ManualQueue implements ThumbnailEnrichmentQueue {
  jobs: ThumbnailJob[] = []

  enqueue(job: ThumbnailJob) {
    this.jobs.push(job)
    return true
  }

  async runNext() {
    const job = this.jobs.shift()
    if (!job) throw new Error('No queued thumbnail job.')
    await job.run()
  }
}

const asset: MediaAsset = {
  id: 'video',
  libraryId: 'library',
  rootName: 'Videos',
  name: 'video.mp4',
  extension: '.mp4',
  pathParts: [],
  source: { kind: 'desktop-path', absolutePath: 'C:\\Videos\\video.mp4' },
  size: 100,
  lastModified: 200,
  thumbnailStatus: 'idle',
}

function createDependencies(queue: ThumbnailEnrichmentQueue): ThumbnailEnrichmentDependencies {
  return {
    queue,
    readCachedThumbnail: vi.fn(async () => null),
    writeThumbnail: vi.fn(async () => undefined),
    createBlobKey: vi.fn(() => 'key:video'),
    generateThumbnail: vi.fn(async () => thumbnailResult(false)),
    generateRefinedThumbnail: vi.fn(async () => thumbnailResult(false)),
    readMetadata: vi.fn(async () => ({ duration: 12, width: 1920, height: 1080 })),
  }
}

function thumbnailResult(isDark: boolean) {
  return {
    blob: new Blob(['thumbnail']),
    duration: 12,
    width: 1920,
    height: 1080,
    isDark,
  }
}
