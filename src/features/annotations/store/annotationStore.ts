import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { idbStateStorage } from '../../../shared/persistence/idbStateStorage'

export const MAX_TAG_NAME_LENGTH = 32

export const TAG_COLOR_OPTIONS = [
  { label: 'Violet', value: '#A78BFA' },
  { label: 'Rose', value: '#FB7185' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Lime', value: '#A3E635' },
  { label: 'Emerald', value: '#34D399' },
  { label: 'Teal', value: '#2DD4BF' },
  { label: 'Cyan', value: '#22D3EE' },
  { label: 'Sky', value: '#38BDF8' },
  { label: 'Blue', value: '#60A5FA' },
  { label: 'Indigo', value: '#818CF8' },
  { label: 'Purple', value: '#C084FC' },
  { label: 'Orange', value: '#FB923C' },
] as const

export type TagColor = (typeof TAG_COLOR_OPTIONS)[number]['value']

export type TagDefinition = {
  id: string
  name: string
  color: TagColor
  createdAt: number
}

export type MediaAnnotation = {
  favorite: boolean
  tagIds: string[]
  updatedAt: number
}

export type AnnotationData = Pick<
  AnnotationState,
  'tagsById' | 'orderedTagIds' | 'annotationsByMediaId'
>

type AnnotationState = {
  tagsById: Record<string, TagDefinition>
  orderedTagIds: string[]
  annotationsByMediaId: Record<string, MediaAnnotation>
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
  deleteTag: (tagId: string) => void
  toggleFavorite: (mediaId: string) => void
  toggleMediaTag: (mediaId: string, tagId: string) => void
  addMediaTag: (mediaId: string, tagId: string) => void
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

        const currentTags = get().orderedTagIds.flatMap((tagId) => {
          const tag = get().tagsById[tagId]
          return tag ? [tag] : []
        })
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

      deleteTag: (tagId) =>
        set((state) => {
          const tagsById = { ...state.tagsById }
          delete tagsById[tagId]
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
            orderedTagIds: state.orderedTagIds.filter((id) => id !== tagId),
            annotationsByMediaId,
            selectedTagIds: state.selectedTagIds.filter((id) => id !== tagId),
            ...(state.bulkTagId === tagId
              ? { bulkTagId: null, bulkSelectedMediaIds: [] }
              : {}),
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
            : [...current.tagIds, tagId]
          return {
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
          if (current.tagIds.includes(tagId)) return state
          return {
            annotationsByMediaId: updateAnnotationRecord(
              state.annotationsByMediaId,
              mediaId,
              { ...current, tagIds: [...current.tagIds, tagId], updatedAt: Date.now() },
            ),
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
        const { bulkTagId, bulkSelectedMediaIds, addMediaTag } = get()
        if (!bulkTagId) return 0
        for (const mediaId of bulkSelectedMediaIds) addMediaTag(mediaId, bulkTagId)
        const count = bulkSelectedMediaIds.length
        set({ bulkTagId: null, bulkSelectedMediaIds: [] })
        return count
      },
      mergeAnnotationData: (data) =>
        set({
          tagsById: data.tagsById,
          orderedTagIds: data.orderedTagIds,
          annotationsByMediaId: data.annotationsByMediaId,
        }),
    }),
    {
      name: 'void-annotations-store',
      storage: createJSONStorage(() => idbStateStorage),
      partialize: (state) => ({
        tagsById: state.tagsById,
        orderedTagIds: state.orderedTagIds,
        annotationsByMediaId: state.annotationsByMediaId,
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
