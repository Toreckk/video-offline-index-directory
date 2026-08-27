import { getVoidPlatform, type NativeMediaMetadata } from '@void/core'
import type { MediaAsset } from '../store/mediaStore'
import { thumbnailQueue, type ThumbnailJob } from './thumbnailQueue'

export type NativeMetadataPatch = Partial<Pick<
  MediaAsset,
  'duration' | 'width' | 'height' | 'videoCodec' | 'audioCodec' | 'mediaProbeStatus'
>>

type ProbeQueue = {
  enqueue: (job: ThumbnailJob) => boolean
}

type NativeMetadataDependencies = {
  queue: ProbeQueue
  getStatus: () => Promise<{ available: boolean }>
  probe: (absolutePath: string) => Promise<NativeMediaMetadata>
}

export async function scheduleNativeMetadataEnrichment(options: {
  assets: readonly MediaAsset[]
  signal: AbortSignal
  onAssetUpdate: (id: string, patch: NativeMetadataPatch) => void
  onDiagnostic?: (asset: MediaAsset, error: unknown) => void
  onComplete?: () => void
}, dependencies: NativeMetadataDependencies = createDefaultDependencies()) {
  const candidates = options.assets.filter((asset) =>
    asset.source.kind === 'desktop-path' && asset.mediaProbeStatus !== 'ready',
  )
  if (!candidates.length || options.signal.aborted) return { available: false, enqueued: 0 }

  const status = await dependencies.getStatus()
  if (!status.available || options.signal.aborted) return { available: false, enqueued: 0 }

  let pending = 0
  let schedulingComplete = false
  const finish = () => {
    if (schedulingComplete && pending === 0 && !options.signal.aborted) options.onComplete?.()
  }
  for (const asset of candidates) {
    if (asset.source.kind !== 'desktop-path') continue
    const didEnqueue = dependencies.queue.enqueue({
      id: `media-probe:${asset.id}`,
      priority: 'deferred',
      run: async () => {
        try {
          if (options.signal.aborted || asset.source.kind !== 'desktop-path') return
          const metadata = await dependencies.probe(asset.source.absolutePath)
          if (options.signal.aborted) return
          options.onAssetUpdate(asset.id, {
            duration: metadata.duration ?? asset.duration,
            width: metadata.width ?? asset.width,
            height: metadata.height ?? asset.height,
            videoCodec: metadata.videoCodec,
            audioCodec: metadata.audioCodec,
            mediaProbeStatus: 'ready',
          })
        } catch (error) {
          if (!options.signal.aborted) {
            options.onAssetUpdate(asset.id, { mediaProbeStatus: 'error' })
            options.onDiagnostic?.(asset, error)
          }
        } finally {
          pending -= 1
          finish()
        }
      },
    })
    if (didEnqueue) pending += 1
  }
  schedulingComplete = true
  finish()
  return { available: true, enqueued: pending }
}

function createDefaultDependencies(): NativeMetadataDependencies {
  const platform = getVoidPlatform()
  return {
    queue: thumbnailQueue,
    getStatus: async () => platform.getMediaProbeStatus?.() ?? { available: false },
    probe: async (absolutePath) => {
      if (!platform.probeMedia) throw new Error('Native media analysis is unavailable.')
      return platform.probeMedia(absolutePath)
    },
  }
}
