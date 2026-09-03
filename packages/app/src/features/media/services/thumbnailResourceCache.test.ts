import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  acquireThumbnailResource,
  clearThumbnailResourceCache,
  getThumbnailResourceCacheStats,
  invalidateThumbnailResource,
} from './thumbnailResourceCache'

describe('thumbnailResourceCache', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => `blob:${blob.size}:${Math.random()}`),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    clearThumbnailResourceCache()
    vi.unstubAllGlobals()
  })

  it('deduplicates concurrent persistent reads and shares one object URL', async () => {
    const load = vi.fn(async () => new Blob(['thumbnail']))
    const first = acquireThumbnailResource('same-key', load)
    const second = acquireThumbnailResource('same-key', load)

    const [firstUrl, secondUrl] = await Promise.all([first.url, second.url])

    expect(load).toHaveBeenCalledTimes(1)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(firstUrl).toBe(secondUrl)
    first.release()
    second.release()
    expect(getThumbnailResourceCacheStats()).toMatchObject({ active: 0, retainedUrls: 1 })
  })

  it('keeps an invalidated URL alive until its final consumer releases it', async () => {
    const load = vi.fn(async () => new Blob(['old']))
    const oldLease = acquireThumbnailResource('versioned-key', load)
    const oldUrl = await oldLease.url

    invalidateThumbnailResource('versioned-key')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()

    const newLease = acquireThumbnailResource('versioned-key', load)
    const newUrl = await newLease.url
    expect(load).toHaveBeenCalledTimes(2)
    expect(newUrl).not.toBe(oldUrl)

    oldLease.release()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(oldUrl)
    newLease.release()
  })

  it('drops failed reads after the final consumer releases them', async () => {
    const lease = acquireThumbnailResource('missing', async () => null)
    await expect(lease.url).resolves.toBeNull()
    lease.release()
    expect(getThumbnailResourceCacheStats().entries).toBe(0)
  })

  it('bounds unused retained URLs while never revoking active leases', async () => {
    const load = vi.fn(async () => new Blob(['thumbnail']))
    const activeLease = acquireThumbnailResource('active', load)
    const activeUrl = await activeLease.url

    for (let index = 0; index < 300; index += 1) {
      const lease = acquireThumbnailResource(`unused-${index}`, load)
      await lease.url
      lease.release()
    }

    expect(getThumbnailResourceCacheStats().retainedUrls).toBeLessThanOrEqual(256)
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(activeUrl)
    activeLease.release()
  })
})
