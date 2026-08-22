import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaAsset } from '../store/mediaStore'
import { restoreMediaCatalog, saveMediaCatalog } from './mediaCatalogCache'
import { createThumbnailBlobKey } from './thumbnailCache'

const database = vi.hoisted(() => new Map<string, unknown>())
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => database.get(key)),
  set: vi.fn(async (key: string, value: unknown) => { database.set(key, value) }),
  del: vi.fn(async (key: string) => { database.delete(key) }),
}))

describe('media catalog cache', () => {
  beforeEach(() => database.clear())

  it('restores lightweight handle-backed assets for an immediate refresh paint', async () => {
    const asset = createAsset('one')
    await saveMediaCatalog('lib_test', [asset])
    expect(await restoreMediaCatalog('lib_test')).toEqual([asset])
    expect(await restoreMediaCatalog('another_library')).toEqual([])
  })

  it('does not persist session File objects and their video bytes', async () => {
    const asset = { ...createAsset('session'), source: { kind: 'session-file' as const, file: {} as File } }
    await saveMediaCatalog('lib_test', [asset])
    expect(await restoreMediaCatalog('lib_test')).toEqual([])
  })

  it('invalidates thumbnails produced by an older cache version', async () => {
    const asset = { ...createAsset('old'), thumbnailBlobKey: 'void-thumbnail:old-key' }
    await saveMediaCatalog('lib_test', [asset])
    expect(await restoreMediaCatalog('lib_test')).toMatchObject([{ id: 'old', thumbnailStatus: 'idle', thumbnailBlobKey: undefined }])
  })
})

function createAsset(id: string): MediaAsset {
  return { id, libraryId: 'lib_test', rootName: 'Videos', name: `${id}.mp4`, extension: '.mp4', pathParts: [], source: { kind: 'file-system-handle', handle: {} as FileSystemFileHandle }, size: 10, lastModified: 1, thumbnailStatus: 'ready', thumbnailBlobKey: createThumbnailBlobKey(id, 1, 10) }
}
