import { getVoidPlatform, type NativeMediaFile } from '@void/core'
import { createMediaId } from '../../../utils/media'
import type { MediaAsset } from '../../media/store/mediaStore'
import {
  nativeMediaFileToSource,
  type LibraryScanSource,
} from '../../media/services/mediaFileSource'
import {
  getFileMetadata,
  getSupportedVideoExtension,
  walkDirectory,
  walkFileSelection,
  type DiscoveredVideoFile,
} from './fileSystem'

const DEFAULT_BATCH_SIZE = 32

export type DiscoveryDiagnostic = {
  stage: 'discovery' | 'metadata'
  path: string
  message: string
}

export type DiscoveryPipelineOptions = {
  source: LibraryScanSource
  scanSubfolders: boolean
  signal: AbortSignal
  batchSize?: number
  onFoldersScanned?: (count: number) => void
  onBatch?: (assets: MediaAsset[]) => void | Promise<void>
  onDiagnostic?: (diagnostic: DiscoveryDiagnostic) => void
}

type FileListingOptions = {
  scanSubfolders: boolean
  signal: AbortSignal
  onDirectoryVisited: (pathParts: readonly string[]) => void
  onError: (details: { pathParts: readonly string[]; error: unknown }) => void
}

export type DiscoveryPipelineDependencies = {
  listFiles: (
    source: LibraryScanSource,
    options: FileListingOptions,
  ) => AsyncGenerator<DiscoveredVideoFile>
  readMetadata: typeof getFileMetadata
}

const DEFAULT_DEPENDENCIES: DiscoveryPipelineDependencies = {
  listFiles: getDiscoveredFiles,
  readMetadata: getFileMetadata,
}

export async function runDiscoveryPipeline(
  options: DiscoveryPipelineOptions,
  dependencies: DiscoveryPipelineDependencies = DEFAULT_DEPENDENCIES,
) {
  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE)
  const discoveredIds = new Set<string>()
  let foldersScanned = 0
  let batch: Promise<MediaAsset | null>[] = []

  const flush = async () => {
    if (batch.length === 0) return
    const assets = (await Promise.all(batch)).filter(
      (asset): asset is MediaAsset => asset !== null,
    )
    batch = []
    throwIfAborted(options.signal)
    if (assets.length > 0) await options.onBatch?.(assets)
  }

  const files = dependencies.listFiles(options.source, {
    scanSubfolders: options.scanSubfolders,
    signal: options.signal,
    onDirectoryVisited: () => {
      foldersScanned += 1
      options.onFoldersScanned?.(foldersScanned)
    },
    onError: ({ pathParts, error }) => {
      options.onDiagnostic?.({
        stage: 'discovery',
        path: pathParts.join('/') || 'Library root',
        message: getErrorMessage(error),
      })
    },
  })

  for await (const file of files) {
    throwIfAborted(options.signal)
    batch.push(
      createAsset(options.source.libraryId, options.source.rootName, file, dependencies)
        .then((asset) => {
          discoveredIds.add(asset.id)
          return asset
        })
        .catch((error) => {
          options.onDiagnostic?.({
            stage: 'metadata',
            path: [...file.pathParts, file.name].join('/'),
            message: getErrorMessage(error),
          })
          return null
        }),
    )
    if (batch.length >= batchSize) await flush()
  }

  await flush()
  throwIfAborted(options.signal)
  return { discoveredIds: [...discoveredIds], foldersScanned }
}

async function createAsset(
  libraryId: string,
  rootName: string,
  file: DiscoveredVideoFile,
  dependencies: DiscoveryPipelineDependencies,
): Promise<MediaAsset> {
  const metadata = file.size !== undefined && file.lastModified !== undefined
    ? { size: file.size, lastModified: file.lastModified }
    : await dependencies.readMetadata(file.source)
  return {
    id: createMediaId(libraryId, file.pathParts, file.name),
    libraryId,
    rootName,
    ...file,
    ...metadata,
    thumbnailStatus: 'idle',
  }
}

async function* getDiscoveredFiles(
  source: LibraryScanSource,
  options: FileListingOptions,
): AsyncGenerator<DiscoveredVideoFile> {
  if (source.kind === 'directory-handle') {
    yield* walkDirectory(source.directoryHandle, options)
    return
  }
  if (source.kind === 'session-files') {
    yield* walkFileSelection(source.files, options)
    return
  }

  const scanLibrary = getVoidPlatform().scanLibrary
  if (!scanLibrary) throw new Error('Native library scanning is unavailable.')
  const files = await scanLibrary({
    rootPath: source.rootPath,
    scanSubfolders: options.scanSubfolders,
  })
  const folders = new Set(files.map((file) => file.pathParts.join('\u0000')))
  for (const folder of folders) {
    options.onDirectoryVisited(folder ? folder.split('\u0000') : [])
  }
  for (const file of files) {
    throwIfAborted(options.signal)
    const discovered = nativeFileToDiscovered(file)
    if (discovered) yield discovered
  }
}

function nativeFileToDiscovered(file: NativeMediaFile): DiscoveredVideoFile | null {
  const extension = getSupportedVideoExtension(file.name)
  if (!extension) return null
  return {
    name: file.name,
    extension,
    pathParts: file.pathParts,
    source: nativeMediaFileToSource(file),
    size: file.size,
    lastModified: file.lastModified,
  }
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Scan aborted.', 'AbortError')
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown browser or file-system error.'
}
