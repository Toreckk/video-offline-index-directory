import { beforeEach, expect, it, vi } from 'vitest'
import { useMediaStore, type MediaAsset } from '../store/mediaStore'
import { recoverThumbnail } from './thumbnailRecovery'
const mocks = vi.hoisted(() => ({ jobs: [] as Array<{ run: () => Promise<void> }>, generate: vi.fn(), cache: vi.fn() }))
vi.mock('./thumbnailQueue', () => ({ thumbnailQueue: { enqueue: (job: { run: () => Promise<void> }) => { mocks.jobs.push(job); return true } } }))
vi.mock('./generateVideoThumbnail', () => ({ generateVideoThumbnail: mocks.generate }))
vi.mock('./thumbnailCache', () => ({ cacheThumbnail: mocks.cache, createThumbnailBlobKey: () => 'regenerated-key' }))
vi.mock('./thumbnailResourceCache', () => ({ invalidateThumbnailResource: vi.fn() }))
beforeEach(() => { mocks.jobs.length = 0; mocks.generate.mockReset(); mocks.cache.mockReset() })
function install(id: string) {
  const asset: MediaAsset = { id, libraryId: 'library', rootName: 'Videos', name: 'clip.mp4', extension: '.mp4', source: { kind: 'desktop-path', absolutePath: 'C:\\Videos\\clip.mp4' }, pathParts: [], size: 100, lastModified: 1, thumbnailStatus: 'ready', thumbnailBlobKey: 'missing-key' }
  useMediaStore.getState().replaceAssets([asset])
}
it('regenerates a missing cache entry once and stops after a repeated decode failure', async () => {
  install('retry-once')
  mocks.generate.mockResolvedValue({ blob: new Blob(['jpeg']) })
  recoverThumbnail('retry-once', 'missing-key')
  recoverThumbnail('retry-once', 'missing-key')
  expect(mocks.jobs).toHaveLength(1)
  await mocks.jobs[0]!.run()
  expect(useMediaStore.getState().assetsById['retry-once']).toMatchObject({ thumbnailStatus: 'ready', thumbnailBlobKey: 'regenerated-key' })
  recoverThumbnail('retry-once', 'regenerated-key')
  expect(useMediaStore.getState().assetsById['retry-once']?.thumbnailStatus).toBe('error')
  expect(mocks.jobs).toHaveLength(1)
})
it('never publishes a recovered thumbnail over a replacement file', async () => {
  install('replacement')
  let finish!: (value: unknown) => void
  mocks.generate.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  recoverThumbnail('replacement', 'missing-key')
  const job = mocks.jobs[0]!.run()
  useMediaStore.getState().updateAsset('replacement', { lastModified: 2, thumbnailStatus: 'idle' })
  finish({ blob: new Blob(['old jpeg']) })
  await job
  expect(mocks.cache).not.toHaveBeenCalled()
  expect(useMediaStore.getState().assetsById.replacement?.thumbnailStatus).toBe('idle')
})
