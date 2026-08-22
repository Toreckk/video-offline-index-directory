import {
  TAG_COLOR_OPTIONS,
  type AnnotationData,
  type MediaAnnotation,
  type TagColor,
  type TagDefinition,
} from '../model/annotationTypes'
import { selectTags } from './tagCatalog'

export const ANNOTATION_EXPORT_VERSION = 2
const LEGACY_ANNOTATION_EXPORT_VERSION = 1

export type AnnotationExport = {
  schemaVersion: 1 | 2
  exportedAt: string
  tags: TagDefinition[]
  annotations: Array<MediaAnnotation & { mediaId: string }>
  tagImplications?: Record<string, string[]>
}

type CompactTag = [id: string, name: string, color: TagColor, createdAt: number, lastUsedAt: number | null]
type CompactAnnotation = [mediaId: string, favorite: 0 | 1, tagIndexes: number[], updatedAt: number]
type CompactImplication = [sourceTagIndex: number, impliedTagIndexes: number[]]

export type CompactAnnotationExport = {
  v: typeof ANNOTATION_EXPORT_VERSION
  at: string
  t: CompactTag[]
  a: CompactAnnotation[]
  i?: CompactImplication[]
}

export function createAnnotationExport(data: AnnotationData): CompactAnnotationExport {
  const tags = selectTags(data.tagsById, data.orderedTagIds)
  const tagIndexes = new Map(tags.map((tag, index) => [tag.id, index]))
  const implications = Object.entries(data.tagImplications ?? {}).flatMap(([sourceId, impliedIds]): CompactImplication[] => {
    const sourceIndex = tagIndexes.get(sourceId)
    if (sourceIndex === undefined) return []
    const impliedIndexes = impliedIds.flatMap((id) => {
      const index = tagIndexes.get(id)
      return index === undefined ? [] : [index]
    })
    return impliedIndexes.length ? [[sourceIndex, impliedIndexes]] : []
  })
  return {
    v: ANNOTATION_EXPORT_VERSION,
    at: new Date().toISOString(),
    t: tags.map((tag) => [tag.id, tag.name, tag.color, tag.createdAt, tag.lastUsedAt ?? null]),
    a: Object.entries(data.annotationsByMediaId).map(([mediaId, annotation]) => [
      mediaId,
      annotation.favorite ? 1 : 0,
      annotation.tagIds.flatMap((id) => {
        const index = tagIndexes.get(id)
        return index === undefined ? [] : [index]
      }),
      annotation.updatedAt,
    ]),
    ...(implications.length ? { i: implications } : {}),
  }
}

export function parseAnnotationExport(value: unknown): AnnotationExport {
  if (!isRecord(value)) throw new Error('This is not a supported VOID annotation backup.')
  if (value.v === ANNOTATION_EXPORT_VERSION) return parseCompactExport(value)
  if (value.schemaVersion === LEGACY_ANNOTATION_EXPORT_VERSION) return parseLegacyExport(value)
  throw new Error('This is not a supported VOID annotation backup.')
}

function parseCompactExport(value: Record<string, unknown>): AnnotationExport {
  if (!Array.isArray(value.t) || !Array.isArray(value.a)) throw new Error('The annotation backup is incomplete.')
  const colors = new Set<string>(TAG_COLOR_OPTIONS.map(({ value: color }) => color))
  const tags = value.t.map((tag): TagDefinition => {
    if (!Array.isArray(tag) || tag.length < 4 || typeof tag[0] !== 'string' || typeof tag[1] !== 'string' || typeof tag[2] !== 'string' || !colors.has(tag[2]) || typeof tag[3] !== 'number' || (tag[4] !== null && tag[4] !== undefined && typeof tag[4] !== 'number')) throw new Error('The backup contains an invalid tag.')
    return { id: tag[0], name: tag[1], color: tag[2] as TagColor, createdAt: tag[3], ...(typeof tag[4] === 'number' ? { lastUsedAt: tag[4] } : {}) }
  })
  const annotations = value.a.map((annotation): MediaAnnotation & { mediaId: string } => {
    if (!Array.isArray(annotation) || annotation.length < 4 || typeof annotation[0] !== 'string' || (annotation[1] !== 0 && annotation[1] !== 1) || !Array.isArray(annotation[2]) || !annotation[2].every((index) => Number.isInteger(index) && index >= 0 && index < tags.length) || typeof annotation[3] !== 'number') throw new Error('The backup contains an invalid video annotation.')
    return { mediaId: annotation[0], favorite: annotation[1] === 1, tagIds: annotation[2].map((index) => tags[index]!.id), updatedAt: annotation[3] }
  })
  const tagImplications: Record<string, string[]> = {}
  if (value.i !== undefined) {
    if (!Array.isArray(value.i)) throw new Error('The backup contains invalid tag links.')
    for (const implication of value.i) {
      if (!Array.isArray(implication) || implication.length !== 2 || !Number.isInteger(implication[0]) || implication[0] < 0 || implication[0] >= tags.length || !Array.isArray(implication[1]) || !implication[1].every((index) => Number.isInteger(index) && index >= 0 && index < tags.length)) throw new Error('The backup contains invalid tag links.')
      tagImplications[tags[implication[0]]!.id] = implication[1].map((index) => tags[index]!.id)
    }
  }
  return { schemaVersion: 2, exportedAt: typeof value.at === 'string' ? value.at : new Date(0).toISOString(), tags, annotations, tagImplications }
}

function parseLegacyExport(value: Record<string, unknown>): AnnotationExport {
  if (!Array.isArray(value.tags) || !Array.isArray(value.annotations)) throw new Error('The annotation backup is incomplete.')
  const colors = new Set<string>(TAG_COLOR_OPTIONS.map(({ value: color }) => color))
  const tags = value.tags.map((tag): TagDefinition => {
    if (!isRecord(tag) || typeof tag.id !== 'string' || typeof tag.name !== 'string' || typeof tag.color !== 'string' || !colors.has(tag.color) || typeof tag.createdAt !== 'number') throw new Error('The backup contains an invalid tag.')
    return { id: tag.id, name: tag.name, color: tag.color as TagColor, createdAt: tag.createdAt, ...(typeof tag.lastUsedAt === 'number' ? { lastUsedAt: tag.lastUsedAt } : {}) }
  })
  const tagIds = new Set(tags.map((tag) => tag.id))
  const annotations = value.annotations.map((annotation) => {
    if (!isRecord(annotation) || typeof annotation.mediaId !== 'string' || typeof annotation.favorite !== 'boolean' || !Array.isArray(annotation.tagIds) || !annotation.tagIds.every((id) => typeof id === 'string' && tagIds.has(id)) || typeof annotation.updatedAt !== 'number') throw new Error('The backup contains an invalid video annotation.')
    return { mediaId: annotation.mediaId, favorite: annotation.favorite, tagIds: annotation.tagIds as string[], updatedAt: annotation.updatedAt }
  })
  return { schemaVersion: 1, exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date(0).toISOString(), tags, annotations, tagImplications: parseLegacyTagImplications(value.tagImplications, tagIds) }
}

export function mergeAnnotationExport(current: AnnotationData, imported: AnnotationExport): AnnotationData {
  const tagsById = { ...current.tagsById }
  const orderedTagIds = [...current.orderedTagIds]
  const idsByName = new Map(orderedTagIds.flatMap((id) => tagsById[id] ? [[tagsById[id].name.toLocaleLowerCase(), id] as const] : []))
  const importedIdMap = new Map<string, string>()

  for (const tag of imported.tags) {
    const existingId = idsByName.get(tag.name.toLocaleLowerCase())
    if (existingId) { importedIdMap.set(tag.id, existingId); continue }
    let id = tag.id
    if (tagsById[id]) id = `tag_${crypto.randomUUID()}`
    tagsById[id] = { ...tag, id }
    orderedTagIds.push(id)
    idsByName.set(tag.name.toLocaleLowerCase(), id)
    importedIdMap.set(tag.id, id)
  }

  const annotationsByMediaId = { ...current.annotationsByMediaId }
  for (const importedAnnotation of imported.annotations) {
    const existing = annotationsByMediaId[importedAnnotation.mediaId]
    const importedTagIds = importedAnnotation.tagIds.flatMap((id) => importedIdMap.get(id) ?? [])
    annotationsByMediaId[importedAnnotation.mediaId] = { favorite: Boolean(existing?.favorite || importedAnnotation.favorite), tagIds: Array.from(new Set([...(existing?.tagIds ?? []), ...importedTagIds])), updatedAt: Math.max(existing?.updatedAt ?? 0, importedAnnotation.updatedAt) }
  }
  const tagImplications: Record<string, string[]> = { ...(current.tagImplications ?? {}) }
  for (const [sourceId, impliedIds] of Object.entries(imported.tagImplications ?? {})) {
    const mappedSource = importedIdMap.get(sourceId)
    if (!mappedSource) continue
    tagImplications[mappedSource] = Array.from(new Set([...(tagImplications[mappedSource] ?? []), ...impliedIds.flatMap((id) => importedIdMap.get(id) ?? [])]))
  }
  return { tagsById, orderedTagIds, annotationsByMediaId, tagImplications }
}

function parseLegacyTagImplications(value: unknown, tagIds: Set<string>) {
  if (value === undefined) return {}
  if (!isRecord(value)) throw new Error('The backup contains invalid tag links.')
  const result: Record<string, string[]> = {}
  for (const [sourceId, impliedIds] of Object.entries(value)) {
    if (!tagIds.has(sourceId) || !Array.isArray(impliedIds) || !impliedIds.every((id) => typeof id === 'string' && tagIds.has(id))) throw new Error('The backup contains invalid tag links.')
    result[sourceId] = impliedIds as string[]
  }
  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
