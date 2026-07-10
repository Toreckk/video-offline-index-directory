import { describe, expect, it, vi } from 'vitest'
import {
  createHandleMediaSource,
  createSessionMediaSource,
  openMediaFile,
} from './mediaFileSource'

describe('MediaFileSource', () => {
  it('opens a persistent file handle lazily', async () => {
    const file = { name: 'clip.mp4' } as File
    const getFile = vi.fn(async () => file)
    const handle = { getFile } as unknown as FileSystemFileHandle

    await expect(openMediaFile(createHandleMediaSource(handle))).resolves.toBe(file)
    expect(getFile).toHaveBeenCalledOnce()
  })

  it('opens a Firefox-style session file without a handle', async () => {
    const file = { name: 'clip.webm' } as File

    await expect(openMediaFile(createSessionMediaSource(file))).resolves.toBe(file)
  })
})
