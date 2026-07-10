import { del, get, set } from 'idb-keyval'
import type { MediaAsset } from '../store/mediaStore'

const CATALOG_PREFIX = 'void-media-catalog:'
const CATALOG_VERSION = 1

type MediaCatalog = {
  version: typeof CATALOG_VERSION
  libraryId: string
  savedAt: number
  assets: MediaAsset[]
}

export async function saveMediaCatalog(libraryId: string, assets: readonly MediaAsset[]) {
  const persistentAssets = assets.filter((asset) => asset.source.kind === 'file-system-handle')
  if (assets.length > 0 && persistentAssets.length === 0) return
  const catalog: MediaCatalog = { version: CATALOG_VERSION, libraryId, savedAt: Date.now(), assets: persistentAssets }
  await set(`${CATALOG_PREFIX}${libraryId}`, catalog)
}

export async function restoreMediaCatalog(libraryId: string) {
  const catalog = await get<MediaCatalog>(`${CATALOG_PREFIX}${libraryId}`)
  if (!catalog || catalog.version !== CATALOG_VERSION || catalog.libraryId !== libraryId || !Array.isArray(catalog.assets)) return []
  return catalog.assets.filter((asset) => asset.libraryId === libraryId && asset.source?.kind === 'file-system-handle')
}

export async function deleteMediaCatalog(libraryId: string) {
  await del(`${CATALOG_PREFIX}${libraryId}`)
}
