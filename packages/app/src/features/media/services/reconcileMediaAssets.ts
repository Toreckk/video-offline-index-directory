import type { NativeLibraryRename } from '@void/core'
import type { MediaAsset } from '../store/mediaStore'

export type MediaIdMigration = {
  fromId: string
  toId: string
}

export type MediaReconciliation = {
  assets: MediaAsset[]
  affectedAssets: MediaAsset[]
  addedAssets: MediaAsset[]
  changedAssets: MediaAsset[]
  removedIds: string[]
  renamedMediaIds: MediaIdMigration[]
}

export function reconcileMediaAssets(
  existingAssets: readonly MediaAsset[],
  discoveredAssets: readonly MediaAsset[],
  renames: readonly NativeLibraryRename[] = [],
): MediaReconciliation {
  const existingById = new Map(existingAssets.map((asset) => [asset.id, asset]))
  const discoveredById = new Map(discoveredAssets.map((asset) => [asset.id, asset]))
  // Watcher ordering is only a hint. Unique native identity is the authority,
  // including moves reported as separate From/To events or made while closed.
  void renames
  const group = (assets: readonly MediaAsset[]) => {
    const result = new Map<string, MediaAsset[]>()
    for (const asset of assets) {
      if (!asset.fileIdentity) continue
      const key = JSON.stringify([asset.libraryId, asset.fileIdentity])
      result.set(key, [...(result.get(key) ?? []), asset])
    }
    return result
  }
  const before = group(existingAssets)
  const after = group(discoveredAssets)
  const renameTargets = new Map<string, MediaAsset>()
  const renamedMediaIds: MediaIdMigration[] = []
  for (const [identity, sources] of before) {
    const targets = after.get(identity)
    if (sources.length !== 1 || targets?.length !== 1) continue
    const existing = sources[0]!
    const discovered = targets[0]!
    if (existing.id === discovered.id || discoveredById.has(existing.id) ||
      existingById.has(discovered.id) || !hasSameFileVersion(existing, discovered)) continue
    renameTargets.set(discovered.id, existing)
    renamedMediaIds.push({ fromId: existing.id, toId: discovered.id })
  }

  const reconciledById = new Map<string, MediaAsset>()
  const addedAssets: MediaAsset[] = []
  const changedAssets: MediaAsset[] = []
  const affectedAssets: MediaAsset[] = []

  for (const discovered of discoveredAssets) {
    const existing = existingById.get(discovered.id)
    const renamedFrom = renameTargets.get(discovered.id)
    const previous = existing ?? renamedFrom
    if (!previous) {
      reconciledById.set(discovered.id, discovered)
      addedAssets.push(discovered)
      affectedAssets.push(discovered)
      continue
    }

    if (hasSameFileVersion(previous, discovered)) {
      const preserved = preserveEnrichment(discovered, previous)
      reconciledById.set(discovered.id, preserved)
      if (preserved.thumbnailStatus === 'queued') affectedAssets.push(preserved)
      continue
    }

    reconciledById.set(discovered.id, discovered)
    changedAssets.push(discovered)
    affectedAssets.push(discovered)
  }

  const renamedFromIds = new Set(renamedMediaIds.map(({ fromId }) => fromId))
  const removedIds = existingAssets
    .filter((asset) => !discoveredById.has(asset.id) && !renamedFromIds.has(asset.id))
    .map((asset) => asset.id)

  const orderedIds: string[] = []
  const included = new Set<string>()
  const renameBySourceId = new Map(
    renamedMediaIds.map(({ fromId, toId }) => [fromId, toId]),
  )
  for (const existing of existingAssets) {
    const nextId = discoveredById.has(existing.id)
      ? existing.id
      : renameBySourceId.get(existing.id)
    if (nextId && reconciledById.has(nextId) && !included.has(nextId)) {
      orderedIds.push(nextId)
      included.add(nextId)
    }
  }
  for (const discovered of discoveredAssets) {
    if (!included.has(discovered.id)) {
      orderedIds.push(discovered.id)
      included.add(discovered.id)
    }
  }

  return {
    assets: orderedIds.flatMap((id) => {
      const asset = reconciledById.get(id)
      return asset ? [asset] : []
    }),
    affectedAssets,
    addedAssets,
    changedAssets,
    removedIds,
    renamedMediaIds,
  }
}

function hasSameFileVersion(left: MediaAsset, right: MediaAsset) {
  return left.size === right.size && left.lastModified === right.lastModified &&
    (!left.fileIdentity || !right.fileIdentity || left.fileIdentity === right.fileIdentity)
}

function preserveEnrichment(asset: MediaAsset, previous: MediaAsset): MediaAsset {
  return {
    ...asset,
    thumbnailStatus: previous.thumbnailStatus,
    thumbnailBlobKey: previous.thumbnailBlobKey,
    duration: previous.duration,
    width: previous.width,
    height: previous.height,
    videoCodec: previous.videoCodec,
    audioCodec: previous.audioCodec,
    mediaProbeStatus: previous.mediaProbeStatus,
  }
}
