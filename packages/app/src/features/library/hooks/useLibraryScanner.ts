import { useCallback, useEffect, useRef } from 'react'
import { FileSystemAccessError } from '../services/fileSystem'
import type { LibraryScanSource } from '../../media/services/mediaFileSource'
import { useLibraryStore } from '../store/libraryStore'
import {
  type MediaAsset,
  useMediaStore,
} from '../../media/store/mediaStore'
import { thumbnailQueue } from '../../media/services/thumbnailQueue'
import { scheduleThumbnailEnrichment } from '../../media/services/thumbnailEnrichmentPipeline'
import { sortMediaAssets } from '../../explorer/services/sortMediaAssets'
import { useSettingsStore } from '../../settings/store/settingsStore'
import { saveMediaCatalog } from '../../media/services/mediaCatalogCache'
import { runDiscoveryPipeline } from '../services/discoveryPipeline'
import { scheduleNativeMetadataEnrichment } from '../../media/services/nativeMetadataEnrichment'

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

      let thumbnailWorkScheduled = false

      try {
        const { discoveredIds } = await runDiscoveryPipeline({
          source,
          scanSubfolders: options.scanSubfolders,
          signal: controller.signal,
          onFoldersScanned: (foldersScanned) => {
            useLibraryStore.getState().updateScanProgress({ foldersScanned })
          },
          onDiagnostic: (diagnostic) => {
            useLibraryStore.getState().addScanDiagnostic({
              ...diagnostic,
              severity: 'error',
            })
          },
          onBatch: async (assets) => {
            useMediaStore.getState().addAssets(assets)
            const ids = useMediaStore.getState().orderedIds
            const store = useLibraryStore.getState()
            store.setMediaIds(ids)
            store.updateScanProgress({ videosFound: ids.length })
            await pauseForPaint()
          },
        })

        mediaStore.retainAssets(discoveredIds)

        const assets = getCurrentAssets()
        const ids = assets.map((asset) => asset.id)
        const currentLibraryStore = useLibraryStore.getState()
        currentLibraryStore.setMediaIds(ids)
        currentLibraryStore.updateScanProgress({
          videosFound: ids.length,
          thumbnailTotal: ids.length,
        })
        currentLibraryStore.setScanStatus('ready')
        void persistCatalog(source.libraryId, assets, source.kind === 'native-directory' ? source.rootPath : undefined)

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
          void enqueueNativeMetadata(assets, controller.signal)
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

async function enqueueNativeMetadata(assets: MediaAsset[], signal: AbortSignal) {
  try {
    await scheduleNativeMetadataEnrichment({
      assets,
      signal,
      onAssetUpdate: (id, patch) => useMediaStore.getState().updateAsset(id, patch),
      onDiagnostic: (asset, error) => {
        useLibraryStore.getState().addScanDiagnostic({
          stage: 'metadata',
          severity: 'warning',
          path: [...asset.pathParts, asset.name].join('/'),
          message: getErrorMessage(error),
        })
      },
      onComplete: () => {
        const store = useLibraryStore.getState()
        if (store.libraryId) {
          void persistCatalog(store.libraryId, getCurrentAssets(), store.rootPath ?? undefined)
        }
      },
    })
  } catch (error) {
    console.warn('Native media analysis could not be scheduled.', error)
  }
}

function enqueueThumbnails(assets: MediaAsset[], signal: AbortSignal) {
  scheduleThumbnailEnrichment({
    assets,
    signal,
    onAssetsQueued: (patches) => useMediaStore.getState().updateAssets(patches),
    onAssetUpdate: (id, patch) => useMediaStore.getState().updateAsset(id, patch),
    onDiagnostic: ({ asset, error }) => {
      console.error(`Could not generate thumbnail for ${asset.name}`, error)
      useLibraryStore.getState().addScanDiagnostic({
        stage: 'thumbnail',
        severity: 'warning',
        path: [...asset.pathParts, asset.name].join('/'),
        message: getErrorMessage(error),
      })
    },
    onProcessed: () => markThumbnailProcessed(),
    onRefinementError: ({ asset, error }) => {
      console.warn(`Could not refine dark thumbnail for ${asset.name}`, error)
    },
    onRefinementsComplete: () => {
      const store = useLibraryStore.getState()
      if (store.libraryId) {
        void persistCatalog(store.libraryId, getCurrentAssets(), store.rootPath ?? undefined)
      }
    },
  })
}

function markThumbnailProcessed() {
  const store = useLibraryStore.getState()
  const thumbnailsGenerated = store.scanProgress.thumbnailsGenerated + 1
  store.updateScanProgress({ thumbnailsGenerated })
  if (thumbnailsGenerated >= store.scanProgress.thumbnailTotal) {
    store.setScanPhase('complete')
    if (store.libraryId) void persistCatalog(store.libraryId, getCurrentAssets(), store.rootPath ?? undefined)
  }
}

function getCurrentAssets() {
  const state = useMediaStore.getState()
  return state.orderedIds.flatMap((id) => {
    const asset = state.assetsById[id]
    return asset ? [asset] : []
  })
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

async function persistCatalog(libraryId: string, assets: MediaAsset[], rootPath?: string) {
  try {
    await saveMediaCatalog(libraryId, assets, rootPath)
  } catch (error) {
    console.warn('Could not cache the media catalog for faster startup.', error)
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown browser or file-system error.'
}
