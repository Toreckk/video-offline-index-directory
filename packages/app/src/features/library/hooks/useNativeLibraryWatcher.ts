import { useEffect } from 'react'
import {
  getVoidPlatform,
  type NativeLibraryRename,
  type NativeLibraryWatchEvent,
} from '@void/core'
import { useAnnotationStore } from '../../annotations/store/annotationStore'
import { usePlaybackStore } from '../../playback/store/playbackStore'
import { saveMediaCatalog } from '../../media/services/mediaCatalogCache'
import type { NativeLibraryScanSource } from '../../media/services/mediaFileSource'
import { reconcileMediaAssets } from '../../media/services/reconcileMediaAssets'
import { scheduleThumbnailEnrichment } from '../../media/services/thumbnailEnrichmentPipeline'
import { thumbnailQueue } from '../../media/services/thumbnailQueue'
import { getMediaAssets, useMediaStore } from '../../media/store/mediaStore'
import { runDiscoveryPipeline } from '../services/discoveryPipeline'
import { useLibraryStore } from '../store/libraryStore'

type NativeLibraryWatcherOptions = {
  enabled: boolean
  source: NativeLibraryScanSource | null
  scanSubfolders: boolean
}

export function useNativeLibraryWatcher({
  enabled,
  source,
  scanSubfolders,
}: NativeLibraryWatcherOptions) {
  useEffect(() => {
    const platform = getVoidPlatform()
    if (!enabled || !source || !platform.watchLibrary) return

    let disposed = false
    let subscription: Awaited<ReturnType<NonNullable<typeof platform.watchLibrary>>> | null = null
    let activeController: AbortController | null = null
    let activeEnrichmentIds: string[] = []
    let reconciliationRunning = false
    let reconciliationQueued = false
    let queuedRenames: NativeLibraryRename[] = []

    const reportDiagnostic = (
      stage: 'watcher' | 'reconciliation',
      message: string,
      path = 'Library root',
    ) => {
      useLibraryStore.getState().addScanDiagnostic({
        stage,
        severity: 'warning',
        path,
        message,
      })
    }

    const reconcile = async (renames: readonly NativeLibraryRename[]) => {
      if (reconciliationRunning) {
        reconciliationQueued = true
        queuedRenames.push(...renames)
        return
      }

      reconciliationRunning = true
      let nextRenames = [...renames]
      try {
        do {
          reconciliationQueued = false
          queuedRenames = []
          activeController?.abort()
          thumbnailQueue.cancelPending(activeEnrichmentIds)
          activeEnrichmentIds = []
          activeController = new AbortController()
          activeEnrichmentIds = await reconcileOnce(
            source,
            scanSubfolders,
            nextRenames,
            activeController.signal,
          )
          nextRenames = queuedRenames
        } while (!disposed && reconciliationQueued)
      } catch (error) {
        if (!isAbortError(error)) {
          console.warn('Native library reconciliation was not committed.', error)
          reportDiagnostic(
            'reconciliation',
            error instanceof Error
              ? error.message
              : 'The library change could not be reconciled safely.',
          )
        }
      } finally {
        reconciliationRunning = false
        useLibraryStore.getState().setIsBackgroundScanning(false)
      }
    }

    const handleWatchEvent = (event: NativeLibraryWatchEvent) => {
      if (event.kind === 'error') {
        reportDiagnostic(
          'watcher',
          event.message ?? 'The native library watcher reported an error.',
        )
      }
      if (event.paths.length > 0) void reconcile(event.renames)
    }

    void platform
      .watchLibrary(
        { rootPath: source.rootPath, scanSubfolders },
        handleWatchEvent,
      )
      .then((createdSubscription) => {
        if (disposed) void createdSubscription.stop().catch(() => undefined)
        else subscription = createdSubscription
      })
      .catch((error: unknown) => {
        if (!disposed) {
          console.warn('Native library watcher could not be started.', error)
          reportDiagnostic(
            'watcher',
            error instanceof Error
              ? error.message
              : 'The native library watcher could not be started.',
          )
        }
      })

    return () => {
      disposed = true
      activeController?.abort()
      thumbnailQueue.cancelPending(activeEnrichmentIds)
      if (subscription) void subscription.stop().catch((error: unknown) => {
        console.warn('Native library watcher could not be stopped cleanly.', error)
      })
    }
  }, [enabled, scanSubfolders, source])
}

async function reconcileOnce(
  source: NativeLibraryScanSource,
  scanSubfolders: boolean,
  renames: readonly NativeLibraryRename[],
  signal: AbortSignal,
) {
  const libraryStore = useLibraryStore.getState()
  libraryStore.setIsBackgroundScanning(true)
  const discoveredAssets: ReturnType<typeof getCurrentAssets> = []
  const diagnostics: Array<{ path: string; message: string }> = []

  await runDiscoveryPipeline({
    source,
    scanSubfolders,
    signal,
    onBatch: (assets) => {
      discoveredAssets.push(...assets)
    },
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  })
  throwIfAborted(signal)
  if (diagnostics.length > 0) {
    const first = diagnostics[0]
    throw new Error(
      `Reconciliation kept the previous catalog because discovery failed at ${first?.path ?? 'the library root'}: ${first?.message ?? 'unknown error'}`,
    )
  }

  const reconciliation = reconcileMediaAssets(
    getCurrentAssets(),
    discoveredAssets,
    renames,
  )
  await saveMediaCatalog(source.libraryId, reconciliation.assets, source.rootPath)
  throwIfAborted(signal)

  for (const { fromId, toId } of reconciliation.renamedMediaIds) {
    useAnnotationStore.getState().moveMediaAnnotations(toId, [fromId])
    usePlaybackStore.getState().movePlaybackRecords(toId, [fromId])
  }
  useMediaStore.getState().replaceAssets(reconciliation.assets)
  const committedIds = reconciliation.assets.map((asset) => asset.id)
  const committedStore = useLibraryStore.getState()
  committedStore.setMediaIds(committedIds)
  committedStore.updateScanProgress({
    videosFound: committedIds.length,
    thumbnailTotal: committedIds.length,
    thumbnailsGenerated: reconciliation.assets.filter(
      (asset) => asset.thumbnailStatus === 'ready',
    ).length,
  })

  if (reconciliation.affectedAssets.length > 0) {
    enrichAffectedAssets(source, reconciliation.affectedAssets, signal)
  }
  return reconciliation.affectedAssets.map((asset) => asset.id)
}

function enrichAffectedAssets(
  source: NativeLibraryScanSource,
  assets: ReturnType<typeof getCurrentAssets>,
  signal: AbortSignal,
) {
  let processed = 0
  const persistCurrentCatalog = () =>
    saveMediaCatalog(source.libraryId, getCurrentAssets(), source.rootPath)
      .catch((error: unknown) => console.warn('Could not persist reconciled thumbnail updates.', error))

  scheduleThumbnailEnrichment({
    assets,
    signal,
    onAssetsQueued: (patches) => useMediaStore.getState().updateAssets(patches),
    onAssetUpdate: (id, patch) => useMediaStore.getState().updateAsset(id, patch),
    onDiagnostic: ({ asset, error }) => {
      useLibraryStore.getState().addScanDiagnostic({
        stage: 'thumbnail',
        severity: 'warning',
        path: [...asset.pathParts, asset.name].join('/'),
        message: error instanceof Error ? error.message : 'Thumbnail generation failed.',
      })
    },
    onProcessed: (asset) => {
      processed += 1
      const currentAsset = useMediaStore.getState().assetsById[asset.id]
      if (currentAsset?.thumbnailStatus === 'ready') {
        const progressStore = useLibraryStore.getState()
        progressStore.updateScanProgress({
          thumbnailsGenerated: Math.min(
            progressStore.scanProgress.thumbnailTotal,
            progressStore.scanProgress.thumbnailsGenerated + 1,
          ),
        })
      }
      if (processed >= assets.length && !signal.aborted) void persistCurrentCatalog()
    },
    onRefinementsComplete: () => {
      if (!signal.aborted) void persistCurrentCatalog()
    },
  })
}

function getCurrentAssets() {
  return getMediaAssets(useMediaStore.getState())
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Reconciliation aborted.', 'AbortError')
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}
