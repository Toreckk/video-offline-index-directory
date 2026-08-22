import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isFileSystemAccessSupported,
  pickDirectory,
} from './picker'

describe('directory picker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports unsupported browsers when the picker API is missing', () => {
    vi.stubGlobal('window', {})

    expect(isFileSystemAccessSupported()).toBe(false)
  })

  it('throws a typed error when picking is unsupported', async () => {
    vi.stubGlobal('window', {})

    await expect(pickDirectory()).rejects.toMatchObject({
      code: 'unsupported-browser',
    })
  })

  it('always requests read-only directory access', async () => {
    const directoryHandle = { kind: 'directory', name: 'Videos' }
    const showDirectoryPicker = vi.fn(async () => directoryHandle)

    vi.stubGlobal('window', { showDirectoryPicker })

    await expect(pickDirectory({ id: 'void-library' })).resolves.toBe(
      directoryHandle,
    )
    expect(showDirectoryPicker).toHaveBeenCalledWith({
      id: 'void-library',
      mode: 'read',
    })
  })

  it('passes through a preferred starting directory', async () => {
    const directoryHandle = { kind: 'directory', name: 'Videos' }
    const startIn = { kind: 'directory', name: 'Previous' }
    const showDirectoryPicker = vi.fn(async () => directoryHandle)

    vi.stubGlobal('window', { showDirectoryPicker })

    await pickDirectory({ startIn: startIn as FileSystemDirectoryHandle })

    expect(showDirectoryPicker).toHaveBeenCalledWith({
      startIn,
      mode: 'read',
    })
  })
})
