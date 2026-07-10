import type { DiscoveredVideoFile, WalkDirectoryOptions } from './apiTypes'
import { FileSystemAccessError } from './errors'
import { getSupportedVideoExtension } from './videoExtensions'
import { createSessionMediaSource } from '../mediaFileSource'

export async function* walkFileSelection(
  files: readonly File[],
  options: WalkDirectoryOptions = {},
): AsyncGenerator<DiscoveredVideoFile> {
  const visitedDirectories = new Set<string>()
  visitDirectory([], visitedDirectories, options)

  for (const file of files) {
    throwIfAborted(options.signal)
    const relativeParts = file.webkitRelativePath.split('/').filter(Boolean)
    const name = relativeParts.at(-1) ?? file.name
    const pathParts = relativeParts.slice(1, -1)

    if (options.scanSubfolders === false && pathParts.length > 0) continue

    for (let depth = 1; depth <= pathParts.length; depth += 1) {
      visitDirectory(pathParts.slice(0, depth), visitedDirectories, options)
    }

    const extension = getSupportedVideoExtension(name)
    if (!extension) continue

    yield {
      name,
      extension,
      pathParts,
      source: createSessionMediaSource(file),
    }
  }
}

function visitDirectory(
  pathParts: readonly string[],
  visitedDirectories: Set<string>,
  options: WalkDirectoryOptions,
) {
  const key = pathParts.join('/')
  if (visitedDirectories.has(key)) return
  visitedDirectories.add(key)
  options.onDirectoryVisited?.(pathParts)
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) {
    throw new FileSystemAccessError('scan-aborted', 'Folder scanning stopped.')
  }
}
