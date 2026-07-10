import { describe, expect, it } from 'vitest'
import { FileSystemAccessError, walkDirectory } from './index'
import type { FileSystemEntryHandle } from './internalTypes'

describe('walkDirectory', () => {
  it('yields lightweight records for supported videos only', async () => {
    const directory = createDirectoryHandle('root', [
      ['clip.mp4', createFileHandle('clip.mp4', 120, 1000)],
      ['poster.jpg', createFileHandle('poster.jpg', 80, 900)],
      ['trailer.WEBM', createFileHandle('trailer.WEBM', 240, 2000)],
      ['future.mov', createFileHandle('future.mov', 480, 3000)],
    ])

    const records = await collect(walkDirectory(directory))

    expect(records).toMatchObject([
      {
        name: 'clip.mp4',
        extension: '.mp4',
        pathParts: [],
      },
      {
        name: 'trailer.WEBM',
        extension: '.webm',
        pathParts: [],
      },
    ])
  })

  it('skips nested directories when scanSubfolders is false', async () => {
    const directory = createDirectoryHandle('root', [
      ['top.mp4', createFileHandle('top.mp4', 100, 1000)],
      [
        'nested',
        createDirectoryHandle('nested', [
          ['child.webm', createFileHandle('child.webm', 200, 2000)],
        ]),
      ],
    ])

    const records = await collect(
      walkDirectory(directory, { scanSubfolders: false }),
    )

    expect(records).toHaveLength(1)
    expect(records[0]?.name).toBe('top.mp4')
  })

  it('includes nested video path parts when scanSubfolders is true', async () => {
    const directory = createDirectoryHandle('root', [
      [
        'nested',
        createDirectoryHandle('nested', [
          ['child.webm', createFileHandle('child.webm', 200, 2000)],
        ]),
      ],
    ])

    const records = await collect(walkDirectory(directory))

    expect(records).toMatchObject([
      {
        name: 'child.webm',
        extension: '.webm',
        pathParts: ['nested'],
      },
    ])
  })

  it('throws a typed error when scanning is aborted', async () => {
    const controller = new AbortController()
    const directory = createDirectoryHandle('root', [
      ['clip.mp4', createFileHandle('clip.mp4', 100, 1000)],
    ])

    controller.abort()

    await expect(
      collect(walkDirectory(directory, { signal: controller.signal })),
    ).rejects.toMatchObject({
      code: 'scan-aborted',
    } satisfies Partial<FileSystemAccessError>)
  })

  it('ignores errors thrown during subfolder iteration and continues walking', async () => {
    const directory = createDirectoryHandle('root', [
      ['clip.mp4', createFileHandle('clip.mp4', 100, 1000)],
      [
        'broken-nested',
        {
          kind: 'directory',
          name: 'broken-nested',
          get entries() {
            throw new Error('Permission Denied or I/O Error')
          },
        } as unknown as FileSystemDirectoryHandle,
      ],
      ['another.webm', createFileHandle('another.webm', 200, 2000)],
    ])

    const records = await collect(walkDirectory(directory))

    expect(records).toMatchObject([
      {
        name: 'clip.mp4',
        extension: '.mp4',
        pathParts: [],
      },
      {
        name: 'another.webm',
        extension: '.webm',
        pathParts: [],
      },
    ])
  })
})

async function collect<T>(iterator: AsyncIterable<T>) {
  const values: T[] = []

  for await (const value of iterator) {
    values.push(value)
  }

  return values
}

function createDirectoryHandle(
  name: string,
  entries: Array<[string, FileSystemEntryHandle]>,
): FileSystemDirectoryHandle {
  const directoryHandle = {
    kind: 'directory',
    name,
    async *entries() {
      yield* entries
    },
  }

  return directoryHandle as FileSystemEntryHandle as FileSystemDirectoryHandle
}

function createFileHandle(
  name: string,
  size: number,
  lastModified: number,
): FileSystemFileHandle {
  const fileHandle = {
    kind: 'file',
    name,
    getFile: async () => ({ name, size, lastModified }) as File,
  }

  return fileHandle as FileSystemEntryHandle as FileSystemFileHandle
}
