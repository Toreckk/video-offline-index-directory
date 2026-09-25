import { useMediaStore } from '../store/mediaStore'
import { thumbnailQueue } from './thumbnailQueue'
import { cacheThumbnail, createThumbnailBlobKey } from './thumbnailCache'
import { generateVideoThumbnail } from './generateVideoThumbnail'
import { invalidateThumbnailResource } from './thumbnailResourceCache'

const attempts = new Map<string, string>()

export function recoverThumbnail(mediaId: string, expectedKey: string) {
  const asset = useMediaStore.getState().assetsById[mediaId]
  if (!asset || asset.availability === 'unavailable' || asset.thumbnailStatus !== 'ready' || asset.thumbnailBlobKey !== expectedKey) return
  const version = JSON.stringify([asset.size, asset.lastModified, asset.fileIdentity])
  if (attempts.get(mediaId) === version) {
    useMediaStore.getState().updateAsset(mediaId, { thumbnailStatus: 'error' })
    return
  }
  if (attempts.size >= 5000) attempts.delete(attempts.keys().next().value!)
  attempts.set(mediaId, version)
  const current = () => {
    const latest = useMediaStore.getState().assetsById[mediaId]
    return latest?.thumbnailBlobKey === expectedKey && latest.size === asset.size && latest.lastModified === asset.lastModified && latest.fileIdentity === asset.fileIdentity
  }
  invalidateThumbnailResource(expectedKey)
  useMediaStore.getState().updateAsset(mediaId, { thumbnailStatus: 'queued' })
  thumbnailQueue.enqueue({ id: `thumbnail-recovery:${mediaId}`, priority: 'visible', run: async () => {
    if (!current()) return
    try {
      const result = await generateVideoThumbnail(asset.source)
      if (!current()) return
      const key = createThumbnailBlobKey(asset.id, asset.lastModified, asset.size)
      await cacheThumbnail(key, result.blob)
      if (current()) useMediaStore.getState().updateAsset(mediaId, { thumbnailStatus: 'ready', thumbnailBlobKey: key })
    } catch {
      if (current()) useMediaStore.getState().updateAsset(mediaId, { thumbnailStatus: 'error' })
    }
  } })
}
