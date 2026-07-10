import { FileSystemAccessError } from './errors'
import type {
  DiscoveredVideoFile,
  WalkDirectoryOptions,
} from './apiTypes'
import type {
  FileSystemEntryHandle,
  IterableFileSystemDirectoryHandle,
  NormalizedWalkDirectoryOptions,
} from './internalTypes'
import { getSupportedVideoExtension } from './videoExtensions'
import { createHandleMediaSource } from '../mediaFileSource'

export async function* walkDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  options: WalkDirectoryOptions = {},
): AsyncGenerator<DiscoveredVideoFile> {
  yield* walkDirectoryEntries(directoryHandle, [], {
    scanSubfolders: options.scanSubfolders ?? true,
    signal: options.signal,
    onDirectoryVisited: options.onDirectoryVisited,
    onError: options.onError,
  })
}

async function* walkDirectoryEntries(
  directoryHandle: FileSystemDirectoryHandle,
  pathParts: string[],
  options: NormalizedWalkDirectoryOptions,
): AsyncGenerator<DiscoveredVideoFile> {
  throwIfAborted(options.signal)
  options.onDirectoryVisited?.(pathParts)

  let entriesIterator: AsyncIterable<[string, FileSystemEntryHandle]>
  try {
    entriesIterator = getDirectoryEntries(directoryHandle)
  } catch (error) {
    options.onError?.({ pathParts, error })
    console.error(
      `Failed to retrieve entries for directory: ${pathParts.join('/') || 'root'}`,
      error,
    )
    return
  }

  try {
    for await (const [name, handle] of entriesIterator) {
      throwIfAborted(options.signal)

      if (isDirectoryHandle(handle)) {
        if (options.scanSubfolders) {
          try {
            yield* walkDirectoryEntries(handle, [...pathParts, name], options)
          } catch (error) {
            if (
              error instanceof FileSystemAccessError &&
              error.code === 'scan-aborted'
            ) {
              throw error
            }
            options.onError?.({ pathParts: [...pathParts, name], error })
            console.error(
              `Failed to scan subfolder: ${[...pathParts, name].join('/')}`,
              error,
            )
          }
        }
        continue
      }

      const extension = getSupportedVideoExtension(name)
      if (!extension) {
        continue
      }

      yield {
        name,
        extension,
        pathParts,
        source: createHandleMediaSource(handle),
      }
    }
  } catch (error) {
    if (
      error instanceof FileSystemAccessError &&
      error.code === 'scan-aborted'
    ) {
      throw error
    }
    options.onError?.({ pathParts, error })
    console.error(
      `Failed to iterate entries for directory: ${pathParts.join('/') || 'root'}`,
      error,
    )
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
