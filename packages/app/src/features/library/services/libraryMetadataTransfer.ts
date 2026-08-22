import type { AnnotationData } from '../../annotations/model/annotationTypes'
import {
  createAnnotationExport,
  mergeAnnotationExport,
  parseAnnotationExport,
  type AnnotationExport,
  type CompactAnnotationExport,
} from '../../annotations/services/annotationTransfer'
import type {
  CollectionRuleNode,
  SmartCollection,
  SmartCollectionRules,
} from '../../collections/model/collectionTypes'
import type { PlaybackData, PlaybackRecord } from '../../playback/model/playbackTypes'

export const LIBRARY_METADATA_EXPORT_VERSION = 1

export type LibraryMetadataExport = {
  kind: 'void-library-metadata'
  version: typeof LIBRARY_METADATA_EXPORT_VERSION
  exportedAt: string
  library: { id: string | null; name: string | null }
  annotations: CompactAnnotationExport
  favoriteTagIds: string[]
  collections: SmartCollection[]
  playback: Array<[mediaId: string, record: PlaybackRecord]>
}

export type ParsedLibraryMetadata = {
  library: LibraryMetadataExport['library']
  annotations: AnnotationExport
  favoriteTagIds: string[]
  collections: SmartCollection[]
  playback: PlaybackData
}

export type MergedLibraryMetadata = {
  annotations: AnnotationData
  favoriteTagIds: string[]
  collectionsById: Record<string, SmartCollection>
  orderedCollectionIds: string[]
  playback: PlaybackData
  importedCollections: number
}

export function createLibraryMetadataExport(input: {
  libraryId: string | null
  libraryName: string | null
  annotations: AnnotationData
  favoriteTagIds: readonly string[]
  collectionsById: Record<string, SmartCollection>
  orderedCollectionIds: readonly string[]
  playback: PlaybackData
}): LibraryMetadataExport {
  return {
    kind: 'void-library-metadata',
    version: LIBRARY_METADATA_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    library: { id: input.libraryId, name: input.libraryName },
    annotations: createAnnotationExport(input.annotations),
    favoriteTagIds: input.favoriteTagIds.filter((id) => input.annotations.tagsById[id]),
    collections: input.orderedCollectionIds.flatMap((id) => {
      const collection = input.collectionsById[id]
      return collection ? [collection] : []
    }),
    playback: Object.entries(input.playback.recordsByMediaId),
  }
}

export function parseLibraryMetadataExport(value: unknown): ParsedLibraryMetadata {
  if (!isRecord(value) || value.kind !== 'void-library-metadata' || value.version !== 1) {
    throw new Error('This is not a supported VOID library metadata backup.')
  }
  if (!isRecord(value.library)) throw new Error('The backup library identity is invalid.')
  const libraryId = value.library.id
  const libraryName = value.library.name
  if ((libraryId !== null && typeof libraryId !== 'string') || (libraryName !== null && typeof libraryName !== 'string')) {
    throw new Error('The backup library identity is invalid.')
  }
  const annotations = parseAnnotationExport(value.annotations)
  if (!Array.isArray(value.favoriteTagIds) || !value.favoriteTagIds.every((id) => typeof id === 'string')) {
    throw new Error('The backup favorite tags are invalid.')
  }
  if (!Array.isArray(value.collections)) throw new Error('The backup collections are invalid.')
  const collections = value.collections.map(parseCollection)
  if (!Array.isArray(value.playback)) throw new Error('The backup playback history is invalid.')
  const recordsByMediaId = Object.fromEntries(value.playback.map(parsePlaybackEntry))
  return {
    library: { id: libraryId, name: libraryName },
    annotations,
    favoriteTagIds: value.favoriteTagIds,
    collections,
    playback: { recordsByMediaId },
  }
}

export function mergeLibraryMetadata(
  current: {
    libraryId: string | null
    annotations: AnnotationData
    favoriteTagIds: readonly string[]
    collectionsById: Record<string, SmartCollection>
    orderedCollectionIds: readonly string[]
    playback: PlaybackData
  },
  imported: ParsedLibraryMetadata,
): MergedLibraryMetadata {
  const remapMediaId = (mediaId: string) =>
    current.libraryId ? replaceLibraryId(mediaId, current.libraryId) : mediaId
  const remappedAnnotations: AnnotationExport = {
    ...imported.annotations,
    annotations: imported.annotations.annotations.map((annotation) => ({
      ...annotation,
      mediaId: remapMediaId(annotation.mediaId),
    })),
  }
  const annotations = mergeAnnotationExport(current.annotations, remappedAnnotations)
  const mergedTagIdByName = new Map(
    annotations.orderedTagIds.flatMap((id) => {
      const tag = annotations.tagsById[id]
      return tag ? [[tag.name.toLocaleLowerCase(), id] as const] : []
    }),
  )
  const importedTagMap = new Map(
    imported.annotations.tags.flatMap((tag) => {
      const mergedId = mergedTagIdByName.get(tag.name.toLocaleLowerCase())
      return mergedId ? [[tag.id, mergedId] as const] : []
    }),
  )
  const favoriteTagIds = Array.from(new Set([
    ...current.favoriteTagIds,
    ...imported.favoriteTagIds.flatMap((id) => importedTagMap.get(id) ?? []),
  ])).filter((id) => annotations.tagsById[id])

  const collectionsById = { ...current.collectionsById }
  const orderedCollectionIds = [...current.orderedCollectionIds]
  const collectionNames = new Set(
    orderedCollectionIds.flatMap((id) => {
      const collection = collectionsById[id]
      return collection ? [collection.name.toLocaleLowerCase()] : []
    }),
  )
  let importedCollections = 0
  for (const collection of imported.collections) {
    if (collectionNames.has(collection.name.toLocaleLowerCase())) continue
    let id = collection.id
    if (collectionsById[id]) id = `collection_${crypto.randomUUID()}`
    const mapped = {
      ...collection,
      id,
      rules: mapCollectionRules(collection.rules, importedTagMap),
    }
    collectionsById[id] = mapped
    orderedCollectionIds.push(id)
    collectionNames.add(mapped.name.toLocaleLowerCase())
    importedCollections += 1
  }

  const recordsByMediaId = { ...current.playback.recordsByMediaId }
  for (const [mediaId, record] of Object.entries(imported.playback.recordsByMediaId)) {
    const mappedId = remapMediaId(mediaId)
    recordsByMediaId[mappedId] = mergePlaybackRecord(recordsByMediaId[mappedId], record)
  }

  return {
    annotations,
    favoriteTagIds,
    collectionsById,
    orderedCollectionIds,
    playback: { recordsByMediaId },
    importedCollections,
  }
}

export function replaceLibraryId(mediaId: string, libraryId: string) {
  const separator = mediaId.indexOf('/')
  if (separator < 0) return mediaId
  return `${encodeURIComponent(libraryId)}${mediaId.slice(separator)}`
}

function mapCollectionRules(
  rules: SmartCollectionRules,
  tagMap: ReadonlyMap<string, string>,
): SmartCollectionRules {
  const mapNode = (node: CollectionRuleNode): CollectionRuleNode | null => {
    if (node.kind === 'tag') {
      const tagId = tagMap.get(node.tagId)
      return tagId ? { ...node, tagId } : null
    }
    if (node.kind === 'watched') return { ...node }
    return { ...node, children: node.children.flatMap((child) => mapNode(child) ?? []) }
  }
  const root = mapNode(rules.root)
  if (!root || root.kind !== 'group') throw new Error('The backup collection rules are invalid.')
  return { root }
}

function mergePlaybackRecord(current: PlaybackRecord | undefined, imported: PlaybackRecord) {
  if (!current) return imported
  const watched = current.watched || imported.watched
  const currentProgress = current.durationSeconds > 0 ? current.positionSeconds / current.durationSeconds : 0
  const importedProgress = imported.durationSeconds > 0 ? imported.positionSeconds / imported.durationSeconds : 0
  const mostAdvanced = importedProgress > currentProgress ? imported : current
  return {
    positionSeconds: watched ? 0 : mostAdvanced.positionSeconds,
    durationSeconds: mostAdvanced.durationSeconds,
    watched,
    lastPlayedAt: Math.max(current.lastPlayedAt, imported.lastPlayedAt),
    completedAt: maxOptional(current.completedAt, imported.completedAt),
    playCount: Math.max(current.playCount, imported.playCount),
  }
}

function parseCollection(value: unknown): SmartCollection {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.createdAt !== 'number' || typeof value.updatedAt !== 'number' || !isRecord(value.rules) || !isRecord(value.rules.root)) {
    throw new Error('The backup contains an invalid collection.')
  }
  validateRule(value.rules.root)
  return value as unknown as SmartCollection
}

function validateRule(value: unknown): void {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.kind !== 'string') {
    throw new Error('The backup contains an invalid collection rule.')
  }
  if (value.kind === 'tag') {
    if (typeof value.tagId !== 'string' || typeof value.negated !== 'boolean') throw new Error('The backup contains an invalid tag rule.')
    return
  }
  if (value.kind === 'watched') {
    if (value.value !== 'watched' && value.value !== 'unwatched') throw new Error('The backup contains an invalid watched rule.')
    return
  }
  if (value.kind !== 'group' || (value.operator !== 'and' && value.operator !== 'or') || typeof value.negated !== 'boolean' || !Array.isArray(value.children)) {
    throw new Error('The backup contains an invalid rule group.')
  }
  value.children.forEach(validateRule)
}

function parsePlaybackEntry(value: unknown): [string, PlaybackRecord] {
  if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== 'string' || !isRecord(value[1])) {
    throw new Error('The backup contains an invalid playback record.')
  }
  const record = value[1]
  if (typeof record.positionSeconds !== 'number' || typeof record.durationSeconds !== 'number' || typeof record.watched !== 'boolean' || typeof record.lastPlayedAt !== 'number' || typeof record.playCount !== 'number' || (record.completedAt !== undefined && typeof record.completedAt !== 'number')) {
    throw new Error('The backup contains an invalid playback record.')
  }
  return [value[0], record as unknown as PlaybackRecord]
}

function maxOptional(left: number | undefined, right: number | undefined) {
  if (left === undefined) return right
  if (right === undefined) return left
  return Math.max(left, right)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
