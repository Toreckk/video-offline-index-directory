import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_TAG_NAME_LENGTH,
  TAG_COLOR_OPTIONS,
  pickDistinctTagColor,
  useAnnotationStore,
} from './annotationStore'

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
  del: vi.fn(async () => undefined),
}))

describe('annotationStore', () => {
  beforeEach(() => {
    useAnnotationStore.setState({
      tagsById: {},
      orderedTagIds: [],
      annotationsByMediaId: {},
      favoritesOnly: false,
      untaggedOnly: false,
      selectedTagIds: [],
      bulkTagId: null,
      bulkSelectedMediaIds: [],
      isHydrated: true,
    })
  })

  it('adds a selection to a tag in one idempotent bulk operation', () => {
    const tag = useAnnotationStore.getState().createTag('travel')
    const store = useAnnotationStore.getState()
    store.startBulkTagging(tag.id)
    store.toggleBulkMedia('one')
    store.toggleBulkMedia('two')
    expect(store.applyBulkTagging()).toBe(2)
    expect(useAnnotationStore.getState().annotationsByMediaId.one?.tagIds).toEqual([tag.id])
    expect(useAnnotationStore.getState().annotationsByMediaId.two?.tagIds).toEqual([tag.id])
    expect(useAnnotationStore.getState().bulkTagId).toBeNull()
  })

  it('creates case-insensitive unique tags and enforces the name limit', () => {
    const first = useAnnotationStore.getState().createTag(' Christmas ')
    const duplicate = useAnnotationStore.getState().createTag('christmas')

    expect(duplicate.id).toBe(first.id)
    expect(useAnnotationStore.getState().orderedTagIds).toHaveLength(1)
    expect(() =>
      useAnnotationStore.getState().createTag('x'.repeat(MAX_TAG_NAME_LENGTH + 1)),
    ).toThrow('at most')
  })

  it('uses every curated color before repeating one', () => {
    const used = TAG_COLOR_OPTIONS.slice(0, -1).map(({ value }) => ({ color: value }))
    expect(pickDistinctTagColor(used, 'last color')).toBe(
      TAG_COLOR_OPTIONS.at(-1)?.value,
    )
  })

  it('persists favorites and multiple tags independently per media id', () => {
    const year = useAnnotationStore.getState().createTag('year:2025')
    const christmas = useAnnotationStore.getState().createTag('christmas')
    const store = useAnnotationStore.getState()
    store.toggleFavorite('media-one')
    store.toggleMediaTag('media-one', year.id)
    store.toggleMediaTag('media-one', christmas.id)

    expect(useAnnotationStore.getState().annotationsByMediaId['media-one']).toMatchObject({
      favorite: true,
      tagIds: [year.id, christmas.id],
    })
  })
})
