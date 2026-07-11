import {
  TAG_COLOR_OPTIONS,
  type AnnotationData,
  type MediaAnnotation,
  type TagColor,
  type TagDefinition,
} from '../model/annotationTypes'
import { selectTags } from './tagCatalog'

export const ANNOTATION_EXPORT_VERSION = 1

export type AnnotationExport = {
  schemaVersion: typeof ANNOTATION_EXPORT_VERSION
  exportedAt: string
  tags: TagDefinition[]
  annotations: Array<MediaAnnotation & { mediaId: string }>
}

export function createAnnotationExport(data: AnnotationData): AnnotationExport {
  return {
    schemaVersion: ANNOTATION_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tags: selectTags(data.tagsById, data.orderedTagIds),
    annotations: Object.entries(data.annotationsByMediaId).map(([mediaId, annotation]) => ({
      mediaId,
      ...annotation,
    })),
  }
}

export function parseAnnotationExport(value: unknown): AnnotationExport {
  if (!isRecord(value) || value.schemaVersion !== ANNOTATION_EXPORT_VERSION) {
    throw new Error('This is not a supported VOID annotation backup.')
  }
  if (!Array.isArray(value.tags) || !Array.isArray(value.annotations)) {
    throw new Error('The annotation backup is incomplete.')
  }
  const colors = new Set<string>(TAG_COLOR_OPTIONS.map(({ value }) => value))
  const tags = value.tags.map((tag): TagDefinition => {
    if (!isRecord(tag) || typeof tag.id !== 'string' || typeof tag.name !== 'string' ||
      typeof tag.color !== 'string' || !colors.has(tag.color) || typeof tag.createdAt !== 'number') {
      throw new Error('The backup contains an invalid tag.')
    }
    return {
      id: tag.id,
      name: tag.name,
      color: tag.color as TagColor,
      createdAt: tag.createdAt,
      ...(typeof tag.lastUsedAt === 'number' ? { lastUsedAt: tag.lastUsedAt } : {}),
    }
  })
  const tagIds = new Set(tags.map((tag) => tag.id))
  const annotations = value.annotations.map((annotation) => {
    if (!isRecord(annotation) || typeof annotation.mediaId !== 'string' ||
      typeof annotation.favorite !== 'boolean' || !Array.isArray(annotation.tagIds) ||
      !annotation.tagIds.every((id) => typeof id === 'string' && tagIds.has(id)) ||
      typeof annotation.updatedAt !== 'number') {
      throw new Error('The backup contains an invalid video annotation.')
    }
    return {
      mediaId: annotation.mediaId,
      favorite: annotation.favorite,
      tagIds: annotation.tagIds as string[],
      updatedAt: annotation.updatedAt,
    }
  })
  return {
    schemaVersion: ANNOTATION_EXPORT_VERSION,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date(0).toISOString(),
    tags,
    annotations,
  }
}

export function mergeAnnotationExport(
  current: AnnotationData,
  imported: AnnotationExport,
): AnnotationData {
  const tagsById = { ...current.tagsById }
  const orderedTagIds = [...current.orderedTagIds]
  const idsByName = new Map(
    orderedTagIds.flatMap((id) => tagsById[id] ? [[tagsById[id].name.toLocaleLowerCase(), id] as const] : []),
  )
  const importedIdMap = new Map<string, string>()

  for (const tag of imported.tags) {
    const existingId = idsByName.get(tag.name.toLocaleLowerCase())
    if (existingId) {
      importedIdMap.set(tag.id, existingId)
      continue
    }
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
    const importedTagIds = importedAnnotation.tagIds.flatMap((id) => {
      const mapped = importedIdMap.get(id)
      return mapped ? [mapped] : []
    })
    annotationsByMediaId[importedAnnotation.mediaId] = {
      favorite: Boolean(existing?.favorite || importedAnnotation.favorite),
      tagIds: Array.from(new Set([...(existing?.tagIds ?? []), ...importedTagIds])),
      updatedAt: Math.max(existing?.updatedAt ?? 0, importedAnnotation.updatedAt),
    }
  }
  return { tagsById, orderedTagIds, annotationsByMediaId }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
