import { del, get, set } from 'idb-keyval'
import { getVoidPlatform, type NativeCatalog, type NativeCatalogAsset } from '@void/core'
import type { MediaAsset } from '../store/mediaStore'
import { isCurrentThumbnailBlobKey } from './thumbnailCache'
import { getSupportedVideoExtension } from '../../library/services/fileSystem'

const CATALOG_PREFIX = 'void-media-catalog:'
const CATALOG_VERSION = 1

type MediaCatalog = {
  version: typeof CATALOG_VERSION
  libraryId: string
  savedAt: number
  assets: MediaAsset[]
}

export async function saveMediaCatalog(libraryId: string, assets: readonly MediaAsset[], rootPath?: string) {
  const platform = getVoidPlatform()
  if (platform.kind === 'desktop') {
    if (!rootPath || !platform.saveCatalog) return
    const persistentAssets = assets.flatMap(toNativeCatalogAsset)
    const catalog: NativeCatalog = {
      version: 1,
      libraryId,
      rootPath,
      savedAt: Date.now(),
      assets: persistentAssets,
    }
    await platform.saveCatalog(catalog)
    return
  }
  const persistentAssets = assets.filter((asset) => asset.source.kind === 'file-system-handle')
  if (assets.length > 0 && persistentAssets.length === 0) return
  const catalog: MediaCatalog = { version: CATALOG_VERSION, libraryId, savedAt: Date.now(), assets: persistentAssets }
  await set(`${CATALOG_PREFIX}${libraryId}`, catalog)
}

export async function restoreMediaCatalog(libraryId: string, rootPath?: string) {
  const platform = getVoidPlatform()
  if (platform.kind === 'desktop') {
    if (!rootPath || !platform.loadCatalog) return []
    const catalog = await platform.loadCatalog(libraryId)
    if (!catalog || catalog.version !== CATALOG_VERSION || catalog.libraryId !== libraryId) return []
    return catalog.assets.flatMap(fromNativeCatalogAsset)
  }
  const catalog = await get<MediaCatalog>(`${CATALOG_PREFIX}${libraryId}`)
  if (!catalog || catalog.version !== CATALOG_VERSION || catalog.libraryId !== libraryId || !Array.isArray(catalog.assets)) return []
  return catalog.assets
    .filter((asset) => asset.libraryId === libraryId && asset.source?.kind === 'file-system-handle')
    .map((asset) => isCurrentThumbnailBlobKey(asset.thumbnailBlobKey)
      ? asset
      : { ...asset, thumbnailStatus: 'idle' as const, thumbnailBlobKey: undefined })
}

export async function deleteMediaCatalog(libraryId: string) {
  const platform = getVoidPlatform()
  if (platform.kind === 'desktop' && platform.deleteCatalog) {
    await platform.deleteCatalog(libraryId)
    return
  }
  await del(`${CATALOG_PREFIX}${libraryId}`)
}

function toNativeCatalogAsset(asset: MediaAsset): NativeCatalogAsset[] {
  if (asset.source.kind !== 'desktop-path') return []
  return [{
    id: asset.id,
    libraryId: asset.libraryId,
    rootName: asset.rootName,
    name: asset.name,
    extension: asset.extension,
    pathParts: asset.pathParts,
    absolutePath: asset.source.absolutePath,
    size: asset.size,
    lastModified: asset.lastModified,
    thumbnailStatus: asset.thumbnailStatus,
    thumbnailBlobKey: asset.thumbnailBlobKey,
    duration: asset.duration,
    width: asset.width,
    height: asset.height,
    videoCodec: asset.videoCodec,
    audioCodec: asset.audioCodec,
    mediaProbeStatus: asset.mediaProbeStatus,
  }]
}

function fromNativeCatalogAsset(asset: NativeCatalogAsset): MediaAsset[] {
  const extension = getSupportedVideoExtension(asset.name)
  if (!extension) return []
  const thumbnailIsCurrent = isCurrentThumbnailBlobKey(asset.thumbnailBlobKey)
  return [{
    id: asset.id,
    libraryId: asset.libraryId,
    rootName: asset.rootName,
    name: asset.name,
    extension,
    pathParts: asset.pathParts,
    source: { kind: 'desktop-path', absolutePath: asset.absolutePath },
    size: asset.size,
    lastModified: asset.lastModified,
    thumbnailStatus: thumbnailIsCurrent ? asset.thumbnailStatus : 'idle',
    thumbnailBlobKey: thumbnailIsCurrent ? asset.thumbnailBlobKey : undefined,
    duration: asset.duration,
    width: asset.width,
    height: asset.height,
    videoCodec: asset.videoCodec,
    audioCodec: asset.audioCodec,
    mediaProbeStatus: asset.mediaProbeStatus,
  }]
}
