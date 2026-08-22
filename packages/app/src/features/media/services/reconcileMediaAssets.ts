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
  const existingByPath = new Map(existingAssets.map((asset) => [mediaPath(asset), asset]))
  const discoveredByPath = new Map(discoveredAssets.map((asset) => [mediaPath(asset), asset]))
  const renameTargets = new Map<string, MediaAsset>()
  const renamedMediaIds: MediaIdMigration[] = []

  for (const rename of renames) {
    const existing = existingByPath.get(normalizePath(rename.fromPath))
    const discovered = discoveredByPath.get(normalizePath(rename.toPath))
    if (!existing || !discovered || existing.id === discovered.id) continue
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
      reconciledById.set(discovered.id, preserveEnrichment(discovered, previous))
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
  return left.size === right.size && left.lastModified === right.lastModified
}

function preserveEnrichment(asset: MediaAsset, previous: MediaAsset): MediaAsset {
  return {
    ...asset,
    thumbnailStatus: previous.thumbnailStatus,
    thumbnailBlobKey: previous.thumbnailBlobKey,
    duration: previous.duration,
    width: previous.width,
    height: previous.height,
  }
}

function mediaPath(asset: MediaAsset) {
  return normalizePath([...asset.pathParts, asset.name].join('/'))
}

function normalizePath(path: string) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '').toLocaleLowerCase()
}
