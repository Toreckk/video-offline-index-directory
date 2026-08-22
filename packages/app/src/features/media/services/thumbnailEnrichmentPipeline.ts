import type { MediaAsset } from '../store/mediaStore'
import {
  generateRefinedVideoThumbnail,
  generateVideoThumbnail,
  readVideoMetadata,
  type GeneratedThumbnail,
  type VideoMetadata,
} from './generateVideoThumbnail'
import {
  cacheThumbnail,
  createThumbnailBlobKey,
  getCachedThumbnail,
} from './thumbnailCache'
import {
  thumbnailQueue,
  type ThumbnailJob,
} from './thumbnailQueue'

export type ThumbnailAssetPatch = Partial<Pick<
  MediaAsset,
  'thumbnailBlobKey' | 'thumbnailStatus' | 'duration' | 'width' | 'height'
>>

export type ThumbnailDiagnostic = {
  asset: MediaAsset
  error: unknown
}

export type ThumbnailEnrichmentOptions = {
  assets: readonly MediaAsset[]
  signal: AbortSignal
  onAssetsQueued?: (patches: Array<{ id: string; patch: ThumbnailAssetPatch }>) => void
  onAssetUpdate?: (id: string, patch: ThumbnailAssetPatch) => void
  onDiagnostic?: (diagnostic: ThumbnailDiagnostic) => void
  onProcessed?: (asset: MediaAsset) => void
  onRefinementError?: (diagnostic: ThumbnailDiagnostic) => void
  onRefinementsComplete?: () => void
}

export type ThumbnailEnrichmentQueue = {
  enqueue: (job: ThumbnailJob) => boolean
}

export type ThumbnailEnrichmentDependencies = {
  queue: ThumbnailEnrichmentQueue
  readCachedThumbnail: typeof getCachedThumbnail
  writeThumbnail: typeof cacheThumbnail
  createBlobKey: typeof createThumbnailBlobKey
  generateThumbnail: (
    source: MediaAsset['source'],
    options: { signal: AbortSignal },
  ) => Promise<GeneratedThumbnail>
  generateRefinedThumbnail: (
    source: MediaAsset['source'],
    options: { signal: AbortSignal },
  ) => Promise<GeneratedThumbnail>
  readMetadata: (
    source: MediaAsset['source'],
    options: { signal: AbortSignal },
  ) => Promise<VideoMetadata>
}

const DEFAULT_DEPENDENCIES: ThumbnailEnrichmentDependencies = {
  queue: thumbnailQueue,
  readCachedThumbnail: getCachedThumbnail,
  writeThumbnail: cacheThumbnail,
  createBlobKey: createThumbnailBlobKey,
  generateThumbnail: generateVideoThumbnail,
  generateRefinedThumbnail: generateRefinedVideoThumbnail,
  readMetadata: readVideoMetadata,
}

export function scheduleThumbnailEnrichment(
  options: ThumbnailEnrichmentOptions,
  dependencies: ThumbnailEnrichmentDependencies = DEFAULT_DEPENDENCIES,
) {
  let pendingRefinements = 0

  const scheduleRefinement = (asset: MediaAsset, thumbnailBlobKey: string) => {
    pendingRefinements += 1
    const didEnqueue = dependencies.queue.enqueue({
      id: asset.id,
      priority: 'deferred',
      run: async () => {
        try {
          if (options.signal.aborted) return
          const result = await dependencies.generateRefinedThumbnail(
            asset.source,
            { signal: options.signal },
          )
          if (options.signal.aborted || result.isDark) return

          const refinedBlobKey = `${thumbnailBlobKey}:refined`
          await dependencies.writeThumbnail(refinedBlobKey, result.blob)
          if (options.signal.aborted) return
          options.onAssetUpdate?.(asset.id, {
            thumbnailBlobKey: refinedBlobKey,
            thumbnailStatus: 'ready',
            duration: result.duration,
            width: result.width,
            height: result.height,
          })
        } catch (error) {
          if (!options.signal.aborted) {
            options.onRefinementError?.({ asset, error })
          }
        } finally {
          pendingRefinements -= 1
          if (!options.signal.aborted && pendingRefinements === 0) {
            options.onRefinementsComplete?.()
          }
        }
      },
    })
    if (!didEnqueue) pendingRefinements -= 1
  }

  options.onAssetsQueued?.(
    options.assets.flatMap((asset) => asset.thumbnailStatus === 'ready'
      ? []
      : [{ id: asset.id, patch: { thumbnailStatus: 'queued' as const } }]),
  )

  let enqueued = 0
  for (const asset of options.assets) {
    const didEnqueue = dependencies.queue.enqueue({
      id: asset.id,
      priority: 'normal',
      run: async () => {
        if (options.signal.aborted) return
        const generatedBlobKey = dependencies.createBlobKey(
          asset.id,
          asset.lastModified,
          asset.size,
        )
        const cachedBlobKey = asset.thumbnailBlobKey ?? generatedBlobKey

        try {
          const cachedBlob = await dependencies.readCachedThumbnail(cachedBlobKey)
          if (options.signal.aborted) return

          if (cachedBlob) {
            const metadata = asset.duration === undefined
              ? await dependencies.readMetadata(asset.source, { signal: options.signal })
              : { duration: asset.duration, width: asset.width, height: asset.height }
            options.onAssetUpdate?.(asset.id, {
              thumbnailBlobKey: cachedBlobKey,
              thumbnailStatus: 'ready',
              duration: metadata.duration,
              width: metadata.width,
              height: metadata.height,
            })
          } else {
            const result = await dependencies.generateThumbnail(
              asset.source,
              { signal: options.signal },
            )
            if (options.signal.aborted) return
            await dependencies.writeThumbnail(generatedBlobKey, result.blob)
            options.onAssetUpdate?.(asset.id, {
              thumbnailBlobKey: generatedBlobKey,
              thumbnailStatus: 'ready',
              duration: result.duration,
              width: result.width,
              height: result.height,
            })
            if (result.isDark) scheduleRefinement(asset, generatedBlobKey)
          }
        } catch (error) {
          if (options.signal.aborted) return
          options.onDiagnostic?.({ asset, error })
          options.onAssetUpdate?.(asset.id, { thumbnailStatus: 'error' })
        } finally {
          if (!options.signal.aborted) options.onProcessed?.(asset)
        }
      },
    })
    if (didEnqueue) enqueued += 1
  }

  return { enqueued }
}
