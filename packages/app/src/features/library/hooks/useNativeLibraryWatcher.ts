import { useEffect } from 'react'
import {
  getVoidPlatform,
  type NativeLibraryRename,
  type NativeLibraryWatchEvent,
} from '@void/core'
import { saveMediaCatalog, toNativeCatalogAsset } from '../../media/services/mediaCatalogCache'
import { commitReconciliation } from '../../media/services/commitReconciliation'
import type { NativeLibraryScanSource } from '../../media/services/mediaFileSource'
import { reconcileMediaAssets } from '../../media/services/reconcileMediaAssets'
import { scheduleThumbnailEnrichment } from '../../media/services/thumbnailEnrichmentPipeline'
import { thumbnailQueue } from '../../media/services/thumbnailQueue'
import { nativeProbeQueue, scheduleNativeMetadataEnrichment } from '../../media/services/nativeMetadataEnrichment'
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
          nativeProbeQueue.cancelPending(activeEnrichmentIds)
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
      if (event.kind === 'error' || event.paths.length > 0) void reconcile(event.renames)
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
      nativeProbeQueue.cancelPending(activeEnrichmentIds)
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

  const discovery = await runDiscoveryPipeline({
    source,
    scanSubfolders,
    signal,
    onBatch: (assets) => {
      discoveredAssets.push(...assets)
    },
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  })
  throwIfAborted(signal)
  if (!discovery.complete) {
    const first = diagnostics[0]
    useLibraryStore.getState().addScanDiagnostic({ stage: 'reconciliation', severity: 'warning', path: first?.path ?? 'Library root',
      message: `Incomplete scan: unseen files were kept as unavailable. ${first?.message ?? 'Discovery could not read every entry.'}` })
  }
  const existing = getCurrentAssets()
  const discoveredIds = new Set(discoveredAssets.map((asset) => asset.id))
  const reconciliation = reconcileMediaAssets(
    existing,
    discovery.complete ? discoveredAssets : [...discoveredAssets, ...existing.filter((asset) => !discoveredIds.has(asset.id)).map((asset) => ({ ...asset, availability: 'unavailable' as const }))],
    discovery.complete ? renames : [],
  )
  await commitReconciliation({ version: 1, libraryId: source.libraryId, rootPath: source.rootPath,
    savedAt: Date.now(), assets: reconciliation.assets.flatMap(toNativeCatalogAsset) }, reconciliation.renamedMediaIds, () => {
    if (!signal.aborted) useMediaStore.getState().replaceAssets(reconciliation.assets)
  })
  throwIfAborted(signal)
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

  const affected = reconciliation.affectedAssets.filter((asset) => asset.availability !== 'unavailable')
  if (affected.length > 0) {
    enrichAffectedAssets(source, affected, signal)
  }
  return affected.flatMap((asset) => [asset.id, `media-probe:${asset.id}`])
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
  void scheduleNativeMetadataEnrichment({
    assets,
    signal,
    onAssetUpdate: (id, patch) => useMediaStore.getState().updateAsset(id, patch),
    onDiagnostic: (asset, error) => {
      useLibraryStore.getState().addScanDiagnostic({
        stage: 'metadata',
        severity: 'warning',
        path: [...asset.pathParts, asset.name].join('/'),
        message: error instanceof Error ? error.message : 'Native media analysis failed.',
      })
    },
    onComplete: () => {
      if (!signal.aborted) void persistCurrentCatalog()
    },
  }).catch((error: unknown) => console.warn('Could not schedule native metadata updates.', error))
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
