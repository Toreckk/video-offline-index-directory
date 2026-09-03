const MAX_RETAINED_URLS = 256

type ThumbnailBlobLoader = (key: string) => Promise<Blob | null>

type ThumbnailResourceEntry = {
  key: string
  consumers: number
  lastUsed: number
  stale: boolean
  url: string | null
  loading: Promise<string | null> | null
}

export type ThumbnailResourceLease = {
  url: Promise<string | null>
  release: () => void
}

const entries = new Map<string, ThumbnailResourceEntry>()
let accessSequence = 0

export function acquireThumbnailResource(
  key: string,
  loadBlob: ThumbnailBlobLoader,
): ThumbnailResourceLease {
  let entry = entries.get(key)
  if (!entry) {
    entry = createEntry(key, loadBlob)
    entries.set(key, entry)
  }

  entry.consumers += 1
  entry.lastUsed = ++accessSequence
  const leasedEntry = entry
  let released = false

  return {
    url: leasedEntry.url
      ? Promise.resolve(leasedEntry.url)
      : leasedEntry.loading ?? Promise.resolve(null),
    release: () => {
      if (released) return
      released = true
      leasedEntry.consumers = Math.max(0, leasedEntry.consumers - 1)
      leasedEntry.lastUsed = ++accessSequence
      if (
        leasedEntry.consumers === 0 &&
        !leasedEntry.url &&
        !leasedEntry.loading &&
        entries.get(leasedEntry.key) === leasedEntry
      ) {
        entries.delete(leasedEntry.key)
      }
      disposeStaleEntry(leasedEntry)
      trimUnusedEntries()
    },
  }
}

export function invalidateThumbnailResource(key: string) {
  const entry = entries.get(key)
  if (!entry) return
  entry.stale = true
  entries.delete(key)
  disposeStaleEntry(entry)
}

export function clearThumbnailResourceCache() {
  for (const entry of entries.values()) {
    entry.stale = true
    disposeStaleEntry(entry)
  }
  entries.clear()
}

export function getThumbnailResourceCacheStats() {
  const currentEntries = [...entries.values()]
  return {
    entries: currentEntries.length,
    active: currentEntries.filter((entry) => entry.consumers > 0).length,
    loading: currentEntries.filter((entry) => entry.loading !== null).length,
    retainedUrls: currentEntries.filter((entry) => entry.url !== null).length,
  }
}

function createEntry(
  key: string,
  loadBlob: ThumbnailBlobLoader,
): ThumbnailResourceEntry {
  const entry: ThumbnailResourceEntry = {
    key,
    consumers: 0,
    lastUsed: ++accessSequence,
    stale: false,
    url: null,
    loading: null,
  }

  entry.loading = loadBlob(key)
    .then((blob) => {
      if (!blob || entry.stale) return null
      entry.url = URL.createObjectURL(blob)
      trimUnusedEntries()
      return entry.url
    })
    .catch(() => null)
    .finally(() => {
      entry.loading = null
      if (!entry.url && entry.consumers === 0 && entries.get(key) === entry) {
        entries.delete(key)
      }
      disposeStaleEntry(entry)
    })

  return entry
}

function trimUnusedEntries() {
  const retainedEntries = [...entries.values()].filter((entry) => entry.url)
  if (retainedEntries.length <= MAX_RETAINED_URLS) return

  const unusedEntries = retainedEntries
    .filter((entry) => entry.consumers === 0)
    .sort((left, right) => left.lastUsed - right.lastUsed)

  let excess = retainedEntries.length - MAX_RETAINED_URLS
  for (const entry of unusedEntries) {
    if (excess <= 0) break
    entries.delete(entry.key)
    entry.stale = true
    disposeStaleEntry(entry)
    excess -= 1
  }
}

function disposeStaleEntry(entry: ThumbnailResourceEntry) {
  if (!entry.stale || entry.consumers > 0 || entry.loading) return
  if (entry.url) URL.revokeObjectURL(entry.url)
  entry.url = null
}
