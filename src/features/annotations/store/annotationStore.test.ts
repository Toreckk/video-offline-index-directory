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
      tagImplications: {},
      favoriteTagIds: [],
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
    expect(useAnnotationStore.getState().tagsById[tag.id]?.lastUsedAt).toEqual(expect.any(Number))
  })

  it('persists user-selected favorite tags independently from video favorites', () => {
    const tag = useAnnotationStore.getState().createTag('frequent')
    useAnnotationStore.getState().toggleTagFavorite(tag.id)
    expect(useAnnotationStore.getState().favoriteTagIds).toEqual([tag.id])
    useAnnotationStore.getState().toggleTagFavorite(tag.id)
    expect(useAnnotationStore.getState().favoriteTagIds).toEqual([])
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

  it('assigns an existing tag when quick-create resolves a duplicate name', () => {
    const existing = useAnnotationStore.getState().createTag('Archive')
    const resolved = useAnnotationStore.getState().createTag(' archive ')
    useAnnotationStore.getState().addMediaTag('media-one', resolved.id)
    expect(resolved.id).toBe(existing.id)
    expect(useAnnotationStore.getState().orderedTagIds).toEqual([existing.id])
    expect(useAnnotationStore.getState().annotationsByMediaId['media-one']?.tagIds).toEqual([existing.id])
  })

  it('adds transitive linked tags and rejects cycles', () => {
    const millennium = useAnnotationStore.getState().createTag('year:1000s')
    const century = useAnnotationStore.getState().createTag('year:1900s')
    const year = useAnnotationStore.getState().createTag('year:1991')
    useAnnotationStore.getState().setTagImplications(century.id, [millennium.id])
    useAnnotationStore.getState().setTagImplications(year.id, [century.id])
    useAnnotationStore.getState().addMediaTag('media-one', year.id)
    expect(useAnnotationStore.getState().annotationsByMediaId['media-one']?.tagIds).toEqual([year.id, century.id, millennium.id])
    expect(() => useAnnotationStore.getState().setTagImplications(millennium.id, [year.id])).toThrow('cycle')
  })

  it('migrates assignments and optionally deletes the source tag', () => {
    const source = useAnnotationStore.getState().createTag('action-adventure')
    const target = useAnnotationStore.getState().createTag('adventure')
    useAnnotationStore.getState().addMediaTag('one', source.id)
    useAnnotationStore.getState().addMediaTag('two', source.id)
    expect(useAnnotationStore.getState().mergeTag(source.id, target.id, true)).toBe(2)
    expect(useAnnotationStore.getState().tagsById[source.id]).toBeUndefined()
    expect(useAnnotationStore.getState().annotationsByMediaId.one?.tagIds).toEqual([target.id])
    expect(useAnnotationStore.getState().annotationsByMediaId.two?.tagIds).toEqual([target.id])
  })

  it('renames tags while preserving ids and rejecting name collisions', () => {
    const first = useAnnotationStore.getState().createTag('archive')
    useAnnotationStore.getState().createTag('history')
    useAnnotationStore.getState().renameTag(first.id, 'Early archive')
    expect(useAnnotationStore.getState().tagsById[first.id]?.name).toBe('Early archive')
    expect(() => useAnnotationStore.getState().renameTag(first.id, 'HISTORY')).toThrow('already exists')
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

  it('copies duplicate annotations into a keeper without clearing source records', () => {
    const first = useAnnotationStore.getState().createTag('first')
    const second = useAnnotationStore.getState().createTag('second')
    useAnnotationStore.getState().addMediaTag('keeper', first.id)
    useAnnotationStore.getState().addMediaTag('duplicate', second.id)
    useAnnotationStore.getState().toggleFavorite('duplicate')

    useAnnotationStore.getState().mergeMediaAnnotations('keeper', ['duplicate'])

    expect(useAnnotationStore.getState().annotationsByMediaId.keeper).toMatchObject({ favorite: true, tagIds: [first.id, second.id] })
    expect(useAnnotationStore.getState().annotationsByMediaId.duplicate).toMatchObject({ favorite: true, tagIds: [second.id] })
  })
})
