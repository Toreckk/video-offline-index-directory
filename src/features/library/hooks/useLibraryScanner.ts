import { useCallback, useEffect, useRef } from 'react'
import {
  FileSystemAccessError,
  getFileMetadata,
  walkDirectory,
  walkFileSelection,
  type DiscoveredVideoFile,
} from '../services/fileSystem'
import type { LibraryScanSource } from '../services/mediaFileSource'
import { useLibraryStore } from '../store/libraryStore'
import {
  type MediaAsset,
  useMediaStore,
} from '../../explorer/store/mediaStore'
import { createMediaId } from '../../../utils/media'
import { generateVideoThumbnail, readVideoMetadata } from '../../explorer/services/generateVideoThumbnail'
import {
  cacheThumbnail,
  createThumbnailBlobKey,
  getCachedThumbnail,
} from '../../explorer/services/thumbnailCache'
import { thumbnailQueue } from '../../explorer/services/thumbnailQueue'
import { sortMediaAssets } from '../../explorer/services/sortMediaAssets'
import { useSettingsStore } from '../../settings/store/settingsStore'
import { saveMediaCatalog } from '../../explorer/services/mediaCatalogCache'

const METADATA_BATCH_SIZE = 8

export function useLibraryScanner() {
  const activeScanRef = useRef<AbortController | null>(null)

  const cancelScan = useCallback(() => {
    activeScanRef.current?.abort()
    activeScanRef.current = null
    thumbnailQueue.clearPending()
  }, [])

  const startScan = useCallback(
    async (
      source: LibraryScanSource,
      options: { scanSubfolders: boolean; preserveExisting?: boolean },
    ) => {
      cancelScan()
      const controller = new AbortController()
      activeScanRef.current = controller
      const libraryStore = useLibraryStore.getState()
      const mediaStore = useMediaStore.getState()

      if (!options.preserveExisting) mediaStore.clearAssets()
      libraryStore.resetScan()
      libraryStore.setScanStatus('scanning')
      libraryStore.setScanPhase('discovering')
      libraryStore.setMediaIds([])

      let foldersScanned = 0
      let batch: Promise<MediaAsset | null>[] = []
      let thumbnailWorkScheduled = false
      const discoveredIds = new Set<string>()

      try {
        const walkOptions = {
          scanSubfolders: options.scanSubfolders,
          signal: controller.signal,
          onDirectoryVisited: () => {
            foldersScanned += 1
            useLibraryStore
              .getState()
              .updateScanProgress({ foldersScanned })
          },
          onError: ({ pathParts, error }: { pathParts: readonly string[]; error: unknown }) => {
            useLibraryStore.getState().addScanDiagnostic({
              stage: 'discovery', severity: 'error', path: pathParts.join('/') || 'Library root', message: getErrorMessage(error),
            })
          },
        }
        const discoveredFiles =
          source.kind === 'directory-handle'
            ? walkDirectory(source.directoryHandle, walkOptions)
            : walkFileSelection(source.files, walkOptions)

        for await (const discoveredFile of discoveredFiles) {
          batch.push(
            discoverAsset(
              source.libraryId,
              source.rootName,
              discoveredFile,
            ).then((asset) => {
              discoveredIds.add(asset.id)
              return asset
            }).catch((error) => {
              console.error(`Could not read metadata for ${discoveredFile.name}`, error)
              useLibraryStore.getState().addScanDiagnostic({
                stage: 'metadata', severity: 'error', path: [...discoveredFile.pathParts, discoveredFile.name].join('/'), message: getErrorMessage(error),
              })
              return null
            }),
          )

          if (batch.length >= METADATA_BATCH_SIZE) {
            await flushBatch(batch, controller.signal)
            batch = []
          }
        }

        await flushBatch(batch, controller.signal)
        throwIfAborted(controller.signal)

        mediaStore.retainAssets([...discoveredIds])

        const assets = getCurrentAssets()
        const ids = assets.map((asset) => asset.id)
        const currentLibraryStore = useLibraryStore.getState()
        currentLibraryStore.setMediaIds(ids)
        currentLibraryStore.updateScanProgress({
          videosFound: ids.length,
          thumbnailTotal: ids.length,
        })
        currentLibraryStore.setScanStatus('ready')
        void persistCatalog(source.libraryId, assets)

        if (assets.length === 0) {
          currentLibraryStore.setScanPhase('complete')
        } else {
          currentLibraryStore.setScanPhase('thumbnails')
          thumbnailWorkScheduled = true
          enqueueThumbnails(
            sortMediaAssets(
              assets,
              useSettingsStore.getState().defaultSortOrder,
            ),
            controller.signal,
          )
        }
      } catch (error) {
        if (isAbortError(error)) {
          const hasPartialResults = useMediaStore.getState().orderedIds.length > 0
          const store = useLibraryStore.getState()
          store.setMediaIds(useMediaStore.getState().orderedIds)
          store.setScanStatus(hasPartialResults ? 'ready' : 'idle')
          store.setScanPhase(hasPartialResults ? 'complete' : 'idle')
          return
        }

        console.error('Library scan failed', error)
        const store = useLibraryStore.getState()
        store.setScanError(
          error instanceof Error ? error.message : 'The library could not be scanned.',
        )
        store.setScanStatus('error')
        store.setScanPhase('idle')
      } finally {
        if (
          activeScanRef.current === controller &&
          !thumbnailWorkScheduled
        ) {
          activeScanRef.current = null
        }
      }
    },
    [cancelScan],
  )

  useEffect(() => cancelScan, [cancelScan])

  return { startScan, cancelScan }
}

async function discoverAsset(
  libraryId: string,
  rootName: string,
  discoveredFile: DiscoveredVideoFile,
): Promise<MediaAsset> {
  const metadata = await getFileMetadata(discoveredFile.source)
  return {
    id: createMediaId(libraryId, discoveredFile.pathParts, discoveredFile.name),
    libraryId,
    rootName,
    ...discoveredFile,
    ...metadata,
    thumbnailStatus: 'idle',
  }
}

async function flushBatch(
  batch: Promise<MediaAsset | null>[],
  signal: AbortSignal,
) {
  if (batch.length === 0) return
  const assets = (await Promise.all(batch)).filter(
    (asset): asset is MediaAsset => asset !== null,
  )
  throwIfAborted(signal)
  useMediaStore.getState().addAssets(assets)
  const ids = useMediaStore.getState().orderedIds
  const libraryStore = useLibraryStore.getState()
  libraryStore.setMediaIds(ids)
  libraryStore.updateScanProgress({ videosFound: ids.length })
  await pauseForPaint()
}

function enqueueThumbnails(assets: MediaAsset[], signal: AbortSignal) {
  for (const asset of assets) {
    if (asset.thumbnailStatus !== 'ready') {
      useMediaStore.getState().updateAsset(asset.id, { thumbnailStatus: 'queued' })
    }
    thumbnailQueue.enqueue({
      id: asset.id,
      priority: 'normal',
      run: async () => {
        if (signal.aborted) return
        const thumbnailBlobKey = createThumbnailBlobKey(
          asset.id,
          asset.lastModified,
          asset.size,
        )

        try {
          const cachedBlob = await getCachedThumbnail(thumbnailBlobKey)
          if (signal.aborted) return

          if (cachedBlob) {
            const metadata = asset.duration === undefined
              ? await readVideoMetadata(asset.source, { signal })
              : { duration: asset.duration, width: asset.width, height: asset.height }
            useMediaStore.getState().updateAsset(asset.id, {
              thumbnailBlobKey,
              thumbnailStatus: 'ready',
              duration: metadata.duration,
              width: metadata.width,
              height: metadata.height,
            })
          } else {
            const result = await generateVideoThumbnail(asset.source, { signal })
            if (signal.aborted) return
            await cacheThumbnail(thumbnailBlobKey, result.blob)
            useMediaStore.getState().updateAsset(asset.id, {
              thumbnailBlobKey,
              thumbnailStatus: 'ready',
              duration: result.duration,
              width: result.width,
              height: result.height,
            })
          }
        } catch (error) {
          if (signal.aborted) return
          console.error(`Could not generate thumbnail for ${asset.name}`, error)
          useLibraryStore.getState().addScanDiagnostic({
            stage: 'thumbnail', severity: 'warning', path: [...asset.pathParts, asset.name].join('/'), message: getErrorMessage(error),
          })
          useMediaStore
            .getState()
            .updateAsset(asset.id, { thumbnailStatus: 'error' })
        } finally {
          if (!signal.aborted) markThumbnailProcessed()
        }
      },
    })
  }
}

function markThumbnailProcessed() {
  const store = useLibraryStore.getState()
  const thumbnailsGenerated = store.scanProgress.thumbnailsGenerated + 1
  store.updateScanProgress({ thumbnailsGenerated })
  if (thumbnailsGenerated >= store.scanProgress.thumbnailTotal) {
    store.setScanPhase('complete')
    if (store.libraryId) void persistCatalog(store.libraryId, getCurrentAssets())
  }
}

function getCurrentAssets() {
  const state = useMediaStore.getState()
  return state.orderedIds.flatMap((id) => {
    const asset = state.assetsById[id]
    return asset ? [asset] : []
  })
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException('Scan aborted.', 'AbortError')
  }
}

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof FileSystemAccessError && error.code === 'scan-aborted')
  )
}

function pauseForPaint() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}

async function persistCatalog(libraryId: string, assets: MediaAsset[]) {
  try {
    await saveMediaCatalog(libraryId, assets)
  } catch (error) {
    console.warn('Could not cache the media catalog for faster startup.', error)
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown browser or file-system error.'
}
