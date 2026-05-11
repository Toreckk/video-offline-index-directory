import { FileSystemAccessError } from './errors'
import type {
  VideoFileRecord,
  WalkDirectoryOptions,
} from './apiTypes'
import type {
  FileSystemEntryHandle,
  IterableFileSystemDirectoryHandle,
  NormalizedWalkDirectoryOptions,
} from './internalTypes'
import { getSupportedVideoExtension } from './videoExtensions'

export async function* walkDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  options: WalkDirectoryOptions = {},
): AsyncGenerator<VideoFileRecord> {
  yield* walkDirectoryEntries(directoryHandle, [], {
    scanSubfolders: options.scanSubfolders ?? true,
    signal: options.signal,
  })
}

async function* walkDirectoryEntries(
  directoryHandle: FileSystemDirectoryHandle,
  pathParts: string[],
  options: NormalizedWalkDirectoryOptions,
): AsyncGenerator<VideoFileRecord> {
  throwIfAborted(options.signal)

  for await (const [name, handle] of getDirectoryEntries(directoryHandle)) {
    throwIfAborted(options.signal)

    if (isDirectoryHandle(handle)) {
      if (options.scanSubfolders) {
        yield* walkDirectoryEntries(handle, [...pathParts, name], options)
      }

      continue
    }

    const extension = getSupportedVideoExtension(name)

    if (!extension) {
      continue
    }

    yield createVideoFileRecord(handle, name, extension, pathParts)
  }
}

async function createVideoFileRecord(
  fileHandle: FileSystemFileHandle,
  name: string,
  extension: VideoFileRecord['extension'],
  pathParts: string[],
): Promise<VideoFileRecord> {
  const file = await fileHandle.getFile()

  return {
    name,
    extension,
    pathParts,
    fileHandle,
    size: file.size,
    lastModified: file.lastModified,
  }
}

function getDirectoryEntries(directoryHandle: FileSystemDirectoryHandle) {
  return (directoryHandle as IterableFileSystemDirectoryHandle).entries()
}

function isDirectoryHandle(
  handle: FileSystemEntryHandle,
): handle is FileSystemDirectoryHandle {
  return handle.kind === 'directory'
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) {
    throw new FileSystemAccessError('scan-aborted', 'Folder scanning stopped.')
  }
}
