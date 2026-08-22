import { describe, expect, it, vi } from 'vitest'
import { walkFileSelection } from './walkFileSelection'

describe('walkFileSelection', () => {
  it('normalizes supported Firefox directory-input files', async () => {
    const records = await collect(
      walkFileSelection([
        createFile('top.mp4', 'Library/top.mp4'),
        createFile('child.webm', 'Library/Nested/child.webm'),
        createFile('notes.txt', 'Library/Nested/notes.txt'),
      ]),
    )

    expect(records).toMatchObject([
      { name: 'top.mp4', extension: '.mp4', pathParts: [] },
      { name: 'child.webm', extension: '.webm', pathParts: ['Nested'] },
    ])
    expect(records[0]?.source.kind).toBe('session-file')
  })

  it('honors subfolder filtering and reports unique visited folders', async () => {
    const onDirectoryVisited = vi.fn()
    const records = await collect(
      walkFileSelection(
        [
          createFile('top.mp4', 'Library/top.mp4'),
          createFile('child.webm', 'Library/Nested/child.webm'),
        ],
        { scanSubfolders: false, onDirectoryVisited },
      ),
    )

    expect(records).toHaveLength(1)
    expect(onDirectoryVisited).toHaveBeenCalledOnce()
    expect(onDirectoryVisited).toHaveBeenCalledWith([])
  })
})

async function collect<T>(iterator: AsyncIterable<T>) {
  const values: T[] = []
  for await (const value of iterator) values.push(value)
  return values
}

function createFile(name: string, webkitRelativePath: string) {
  return { name, webkitRelativePath } as File
}
