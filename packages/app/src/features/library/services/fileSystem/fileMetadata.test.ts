import { describe, expect, it } from 'vitest'
import { getFileMetadata } from './fileMetadata'
import { createHandleMediaSource } from '../mediaFileSource'

describe('getFileMetadata', () => {
  it('resolves size and lastModified from file handle', async () => {
    const mockFile = {
      name: 'video.mp4',
      size: 543210,
      lastModified: 987654321,
    } as unknown as File

    const fileHandle = {
      kind: 'file',
      name: 'video.mp4',
      getFile: async () => mockFile,
    } as unknown as FileSystemFileHandle

    const metadata = await getFileMetadata(createHandleMediaSource(fileHandle))

    expect(metadata).toEqual({
      size: 543210,
      lastModified: 987654321,
    })
  })
})
