import { del, get, keys, set } from 'idb-keyval'

const THUMBNAIL_KEY_PREFIX = 'void-thumbnail:'
const THUMBNAIL_CACHE_VERSION = 'v2'

export function createThumbnailBlobKey(
  mediaId: string,
  lastModified: number,
  size: number,
) {
  return `${THUMBNAIL_KEY_PREFIX}${THUMBNAIL_CACHE_VERSION}:${mediaId}:${lastModified}:${size}`
}

export function isCurrentThumbnailBlobKey(key: string | undefined) {
  return key?.startsWith(`${THUMBNAIL_KEY_PREFIX}${THUMBNAIL_CACHE_VERSION}:`) ?? false
}

export async function getCachedThumbnail(key: string) {
  return (await get<Blob>(key)) ?? null
}

export async function cacheThumbnail(key: string, blob: Blob) {
  await set(key, blob)
}

export async function clearThumbnailCache() {
  const databaseKeys = await keys()
  const thumbnailKeys = databaseKeys.filter(
    (key): key is string =>
      typeof key === 'string' && key.startsWith(THUMBNAIL_KEY_PREFIX),
  )

  await Promise.all(thumbnailKeys.map((key) => del(key)))
  return thumbnailKeys.length
}
