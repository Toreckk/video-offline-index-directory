import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { idbStateStorage } from '../../../shared/persistence/idbStateStorage'
import {
  MAX_TAG_NAME_LENGTH,
  TAG_COLOR_OPTIONS,
  type AnnotationData,
  type MediaAnnotation,
  type TagColor,
  type TagDefinition,
} from '../model/annotationTypes'
import { selectTags } from '../services/tagCatalog'

export {
  MAX_TAG_NAME_LENGTH,
  TAG_COLOR_OPTIONS,
  type AnnotationData,
  type MediaAnnotation,
  type TagColor,
  type TagDefinition,
} from '../model/annotationTypes'

type AnnotationState = Omit<AnnotationData, 'tagImplications'> & {
  tagImplications: Record<string, string[]>
  favoriteTagIds: string[]
  favoritesOnly: boolean
  untaggedOnly: boolean
  selectedTagIds: string[]
  bulkTagId: string | null
  bulkSelectedMediaIds: string[]
  isHydrated: boolean
}

type AnnotationActions = {
  createTag: (name: string, color?: TagColor) => TagDefinition
  updateTagColor: (tagId: string, color: TagColor) => void
  renameTag: (tagId: string, name: string) => void
  mergeTag: (sourceTagId: string, targetTagId: string, deleteSource: boolean) => number
  setTagImplications: (tagId: string, impliedTagIds: string[]) => void
  deleteTag: (tagId: string) => void
  toggleTagFavorite: (tagId: string) => void
  toggleFavorite: (mediaId: string) => void
  toggleMediaTag: (mediaId: string, tagId: string) => void
  addMediaTag: (mediaId: string, tagId: string) => void
  mergeMediaAnnotations: (targetMediaId: string, sourceMediaIds: readonly string[]) => void
  setFavoritesOnly: (enabled: boolean) => void
  setUntaggedOnly: (enabled: boolean) => void
  toggleTagFilter: (tagId: string) => void
  clearFilters: () => void
  startBulkTagging: (tagId: string) => void
  toggleBulkMedia: (mediaId: string) => void
  cancelBulkTagging: () => void
  applyBulkTagging: () => number
  mergeAnnotationData: (data: AnnotationData) => void
}

const EMPTY_ANNOTATION: Omit<MediaAnnotation, 'updatedAt'> = {
  favorite: false,
  tagIds: [],
}

export const useAnnotationStore = create<AnnotationState & AnnotationActions>()(
  persist(
    (set, get) => ({
      tagsById: {},
      orderedTagIds: [],
      annotationsByMediaId: {},
      tagImplications: {},
      favoriteTagIds: [],
      favoritesOnly: false,
      untaggedOnly: false,
      selectedTagIds: [],
      bulkTagId: null,
      bulkSelectedMediaIds: [],
      isHydrated: false,

      createTag: (rawName, requestedColor) => {
        const name = normalizeTagName(rawName)
        const existing = get().orderedTagIds
          .map((tagId) => get().tagsById[tagId])
          .find((tag) => tag?.name.toLocaleLowerCase() === name.toLocaleLowerCase())
        if (existing) return existing

        const currentTags = selectTags(get().tagsById, get().orderedTagIds)
        const tag: TagDefinition = {
          id: `tag_${crypto.randomUUID()}`,
          name,
          color: requestedColor ?? pickDistinctTagColor(currentTags, name),
          createdAt: Date.now(),
        }
        set((state) => ({
          tagsById: { ...state.tagsById, [tag.id]: tag },
          orderedTagIds: [...state.orderedTagIds, tag.id],
        }))
        return tag
      },

      updateTagColor: (tagId, color) =>
        set((state) => {
          const tag = state.tagsById[tagId]
          if (!tag) return state
          return {
            tagsById: {
              ...state.tagsById,
              [tagId]: { ...tag, color },
            },
          }
        }),

      renameTag: (tagId, rawName) => {
        const name = normalizeTagName(rawName)
        const duplicate = selectTags(get().tagsById, get().orderedTagIds).find(
          (tag) =>
            tag.id !== tagId &&
            tag.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
        if (duplicate) throw new Error(`A tag named “${duplicate.name}” already exists.`)
        set((state) => {
          const tag = state.tagsById[tagId]
          if (!tag) return state
          return {
            tagsById: {
              ...state.tagsById,
              [tagId]: { ...tag, name },
            },
          }
        })
      },

      mergeTag: (sourceTagId, targetTagId, deleteSource) => {
        if (sourceTagId === targetTagId) throw new Error('Choose two different tags to merge.')
        const state = get()
        if (!state.tagsById[sourceTagId] || !state.tagsById[targetTagId]) throw new Error('The source or destination tag no longer exists.')
        const expandedTargetIds = expandTagIds([targetTagId], state.tagImplications)
        let affected = 0
        const annotationsByMediaId = Object.fromEntries(
          Object.entries(state.annotationsByMediaId).map(([mediaId, annotation]) => {
            if (!annotation.tagIds.includes(sourceTagId)) return [mediaId, annotation]
            affected += 1
            return [mediaId, { ...annotation, tagIds: Array.from(new Set([...annotation.tagIds.filter((id) => id !== sourceTagId), ...expandedTargetIds])), updatedAt: Date.now() }]
          }),
        )
        const tagImplications = remapTagImplications(state.tagImplications, sourceTagId, targetTagId, deleteSource)
        const tagsById = { ...state.tagsById }
        if (deleteSource) delete tagsById[sourceTagId]
        set({
          annotationsByMediaId,
          tagImplications,
          tagsById,
          orderedTagIds: deleteSource ? state.orderedTagIds.filter((id) => id !== sourceTagId) : state.orderedTagIds,
          favoriteTagIds: deleteSource ? state.favoriteTagIds.filter((id) => id !== sourceTagId) : state.favoriteTagIds,
          selectedTagIds: deleteSource ? state.selectedTagIds.filter((id) => id !== sourceTagId) : state.selectedTagIds,
        })
        return affected
      },

      setTagImplications: (tagId, impliedTagIds) => {
        const state = get()
        if (!state.tagsById[tagId]) throw new Error('The trigger tag no longer exists.')
        const normalized = Array.from(new Set(impliedTagIds)).filter((id) => state.tagsById[id] && id !== tagId)
        const candidate = { ...state.tagImplications, [tagId]: normalized }
        if (hasImplicationCycle(candidate)) throw new Error('Tag links cannot contain a cycle.')
        set({ tagImplications: candidate })
      },

      deleteTag: (tagId) =>
        set((state) => {
          const tagsById = { ...state.tagsById }
          delete tagsById[tagId]
          const tagImplications = Object.fromEntries(
            Object.entries(state.tagImplications)
              .filter(([sourceId]) => sourceId !== tagId)
              .map(([sourceId, impliedIds]) => [sourceId, impliedIds.filter((id) => id !== tagId)]),
          )
          const annotationsByMediaId = Object.fromEntries(
            Object.entries(state.annotationsByMediaId).flatMap(
              ([mediaId, annotation]) => {
                const next = {
                  ...annotation,
                  tagIds: annotation.tagIds.filter((id) => id !== tagId),
                  updatedAt: Date.now(),
                }
                return next.favorite || next.tagIds.length > 0
                  ? [[mediaId, next]]
                  : []
              },
            ),
          )
          return {
            tagsById,
            tagImplications,
            orderedTagIds: state.orderedTagIds.filter((id) => id !== tagId),
            annotationsByMediaId,
            favoriteTagIds: state.favoriteTagIds.filter((id) => id !== tagId),
            selectedTagIds: state.selectedTagIds.filter((id) => id !== tagId),
            ...(state.bulkTagId === tagId
              ? { bulkTagId: null, bulkSelectedMediaIds: [] }
              : {}),
          }
        }),

      toggleTagFavorite: (tagId) =>
        set((state) => {
          if (!state.tagsById[tagId]) return state
          return {
            favoriteTagIds: state.favoriteTagIds.includes(tagId)
              ? state.favoriteTagIds.filter((id) => id !== tagId)
              : [...state.favoriteTagIds, tagId],
          }
        }),

      toggleFavorite: (mediaId) =>
        set((state) => {
          const current = state.annotationsByMediaId[mediaId] ?? EMPTY_ANNOTATION
          return {
            annotationsByMediaId: updateAnnotationRecord(
              state.annotationsByMediaId,
              mediaId,
              { ...current, favorite: !current.favorite, updatedAt: Date.now() },
            ),
          }
        }),

      toggleMediaTag: (mediaId, tagId) =>
        set((state) => {
          if (!state.tagsById[tagId]) return state
          const current = state.annotationsByMediaId[mediaId] ?? EMPTY_ANNOTATION
          const hasTag = current.tagIds.includes(tagId)
          const tagIds = hasTag
            ? current.tagIds.filter((id) => id !== tagId)
            : Array.from(new Set([...current.tagIds, ...expandTagIds([tagId], state.tagImplications)]))
          return {
            tagsById: hasTag
              ? state.tagsById
              : touchTag(state.tagsById, tagId),
            annotationsByMediaId: updateAnnotationRecord(
              state.annotationsByMediaId,
              mediaId,
              { ...current, tagIds, updatedAt: Date.now() },
            ),
          }
        }),

      addMediaTag: (mediaId, tagId) =>
        set((state) => {
          if (!state.tagsById[tagId]) return state
          const current = state.annotationsByMediaId[mediaId] ?? EMPTY_ANNOTATION
          const expandedTagIds = expandTagIds([tagId], state.tagImplications)
          if (expandedTagIds.every((id) => current.tagIds.includes(id))) return state
          return {
            tagsById: touchTag(state.tagsById, tagId),
            annotationsByMediaId: updateAnnotationRecord(
              state.annotationsByMediaId,
              mediaId,
              { ...current, tagIds: Array.from(new Set([...current.tagIds, ...expandedTagIds])), updatedAt: Date.now() },
            ),
          }
        }),

      mergeMediaAnnotations: (targetMediaId, sourceMediaIds) =>
        set((state) => {
          const annotations = [...new Set([targetMediaId, ...sourceMediaIds])]
            .flatMap((mediaId) => state.annotationsByMediaId[mediaId] ? [state.annotationsByMediaId[mediaId]] : [])
          if (annotations.length === 0) return state
          const merged: MediaAnnotation = {
            favorite: annotations.some((annotation) => annotation.favorite),
            tagIds: [...new Set(annotations.flatMap((annotation) => annotation.tagIds))],
            updatedAt: Date.now(),
          }
          return {
            annotationsByMediaId: updateAnnotationRecord(state.annotationsByMediaId, targetMediaId, merged),
          }
        }),

      setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),
      setUntaggedOnly: (untaggedOnly) =>
        set({ untaggedOnly, ...(untaggedOnly ? { selectedTagIds: [] } : {}) }),
      toggleTagFilter: (tagId) =>
        set((state) => ({
          untaggedOnly: false,
          selectedTagIds: state.selectedTagIds.includes(tagId)
            ? state.selectedTagIds.filter((id) => id !== tagId)
            : [...state.selectedTagIds, tagId],
        })),
      clearFilters: () => set({ favoritesOnly: false, untaggedOnly: false, selectedTagIds: [] }),
      startBulkTagging: (bulkTagId) => {
        if (get().tagsById[bulkTagId]) set({ bulkTagId, bulkSelectedMediaIds: [] })
      },
      toggleBulkMedia: (mediaId) =>
        set((state) => ({
          bulkSelectedMediaIds: state.bulkSelectedMediaIds.includes(mediaId)
            ? state.bulkSelectedMediaIds.filter((id) => id !== mediaId)
            : [...state.bulkSelectedMediaIds, mediaId],
        })),
      cancelBulkTagging: () => set({ bulkTagId: null, bulkSelectedMediaIds: [] }),
      applyBulkTagging: () => {
        const { bulkTagId, bulkSelectedMediaIds } = get()
        if (!bulkTagId) return 0
        const count = bulkSelectedMediaIds.length
        const updatedAt = Date.now()
        set((state) => {
          const annotationsByMediaId = { ...state.annotationsByMediaId }
          for (const mediaId of state.bulkSelectedMediaIds) {
            const current = annotationsByMediaId[mediaId] ?? EMPTY_ANNOTATION
            const expandedTagIds = expandTagIds([bulkTagId], state.tagImplications)
            if (expandedTagIds.every((id) => current.tagIds.includes(id))) continue
            annotationsByMediaId[mediaId] = {
              ...current,
              tagIds: Array.from(new Set([...current.tagIds, ...expandedTagIds])),
              updatedAt,
            }
          }
          return {
            tagsById: touchTag(state.tagsById, bulkTagId, updatedAt),
            annotationsByMediaId,
            bulkTagId: null,
            bulkSelectedMediaIds: [],
          }
        })
        return count
      },
      mergeAnnotationData: (data) =>
        set({
          tagsById: data.tagsById,
          orderedTagIds: data.orderedTagIds,
          annotationsByMediaId: data.annotationsByMediaId,
          tagImplications: data.tagImplications ?? {},
        }),
    }),
    {
      name: 'void-annotations-store',
      storage: createJSONStorage(() => idbStateStorage),
      partialize: (state) => ({
        tagsById: state.tagsById,
        orderedTagIds: state.orderedTagIds,
        annotationsByMediaId: state.annotationsByMediaId,
        tagImplications: state.tagImplications,
        favoriteTagIds: state.favoriteTagIds,
      }),
      version: 1,
      onRehydrateStorage: () => () => {
        useAnnotationStore.setState({ isHydrated: true })
      },
    },
  ),
)

export function normalizeTagName(rawName: string) {
  const name = rawName.trim().replace(/\s+/g, ' ')
  if (!name) throw new Error('Tag name cannot be empty.')
  if (name.length > MAX_TAG_NAME_LENGTH) {
    throw new Error(`Tag names can contain at most ${MAX_TAG_NAME_LENGTH} characters.`)
  }
  return name
}

export function pickDistinctTagColor(
  existingTags: readonly Pick<TagDefinition, 'color'>[],
  tagName: string,
): TagColor {
  const usage = new Map<TagColor, number>(
    TAG_COLOR_OPTIONS.map(({ value }) => [value, 0]),
  )
  for (const tag of existingTags) {
    usage.set(tag.color, (usage.get(tag.color) ?? 0) + 1)
  }
  const minimumUsage = Math.min(...usage.values())
  const candidates = TAG_COLOR_OPTIONS.filter(
    ({ value }) => usage.get(value) === minimumUsage,
  )
  return candidates[stableHash(tagName) % candidates.length]?.value ?? '#A78BFA'
}

function stableHash(value: string) {
  let hash = 0
  for (const character of value.toLocaleLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }
  return hash
}

function updateAnnotationRecord(
  annotations: Record<string, MediaAnnotation>,
  mediaId: string,
  annotation: MediaAnnotation,
) {
  const next = { ...annotations }
  if (!annotation.favorite && annotation.tagIds.length === 0) delete next[mediaId]
  else next[mediaId] = annotation
  return next
}

function touchTag(
  tagsById: Record<string, TagDefinition>,
  tagId: string,
  lastUsedAt = Date.now(),
) {
  const tag = tagsById[tagId]
  return tag
    ? { ...tagsById, [tagId]: { ...tag, lastUsedAt } }
    : tagsById
}

export function expandTagIds(tagIds: readonly string[], implications: Record<string, string[]>) {
  const expanded = new Set<string>()
  const visit = (tagId: string) => {
    if (expanded.has(tagId)) return
    expanded.add(tagId)
    for (const impliedId of implications[tagId] ?? []) visit(impliedId)
  }
  for (const tagId of tagIds) visit(tagId)
  return [...expanded]
}

function hasImplicationCycle(implications: Record<string, string[]>) {
  const visited = new Set<string>()
  const active = new Set<string>()
  const visit = (tagId: string): boolean => {
    if (active.has(tagId)) return true
    if (visited.has(tagId)) return false
    active.add(tagId)
    for (const impliedId of implications[tagId] ?? []) if (visit(impliedId)) return true
    active.delete(tagId)
    visited.add(tagId)
    return false
  }
  return Object.keys(implications).some(visit)
}

function remapTagImplications(implications: Record<string, string[]>, sourceId: string, targetId: string, deleteSource: boolean) {
  const result: Record<string, string[]> = {}
  for (const [triggerId, impliedIds] of Object.entries(implications)) {
    const mappedTriggerId = deleteSource && triggerId === sourceId ? targetId : triggerId
    const mappedImpliedIds = impliedIds.map((id) => deleteSource && id === sourceId ? targetId : id).filter((id) => id !== mappedTriggerId)
    result[mappedTriggerId] = Array.from(new Set([...(result[mappedTriggerId] ?? []), ...mappedImpliedIds]))
  }
  if (hasImplicationCycle(result)) throw new Error('Merging these tags would create a link cycle.')
  return result
}
