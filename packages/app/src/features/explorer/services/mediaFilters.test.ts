import { describe, expect, it } from 'vitest'
import type { MediaAnnotation } from '../../annotations/model/annotationTypes'
import type { MediaAsset } from '../../media/store/mediaStore'
import { matchesMediaFilters } from './mediaFilters'

const asset = {
  name: 'christmas-morning.mp4',
  pathParts: ['Holidays', '2025'],
} as MediaAsset

const annotation: MediaAnnotation = {
  favorite: true,
  tagIds: ['year-2025', 'christmas'],
  updatedAt: 1,
}

describe('matchesMediaFilters', () => {
  it('uses AND semantics when multiple tags are selected', () => {
    expect(
      matchesMediaFilters(asset, annotation, {
        searchQuery: '',
        folderFilter: null,
        durationFilter: null,
        favoritesOnly: false,
        untaggedOnly: false,
        selectedTagIds: ['year-2025', 'christmas'],
      }),
    ).toBe(true)

    expect(
      matchesMediaFilters(asset, annotation, {
        searchQuery: '',
        folderFilter: null,
        durationFilter: null,
        favoritesOnly: false,
        untaggedOnly: false,
        selectedTagIds: ['year-2025', 'missing'],
      }),
    ).toBe(false)
  })

  it('matches folder descendants, favorites, and filename search together', () => {
    expect(
      matchesMediaFilters(asset, annotation, {
        searchQuery: 'morning',
        folderFilter: 'Holidays',
        durationFilter: null,
        favoritesOnly: true,
        untaggedOnly: false,
        selectedTagIds: [],
      }),
    ).toBe(true)
  })

  it('can isolate videos without any tags', () => {
    const filters = { searchQuery: '', folderFilter: null, durationFilter: null, favoritesOnly: false, untaggedOnly: true, selectedTagIds: [] }
    expect(matchesMediaFilters(asset, undefined, filters)).toBe(true)
    expect(matchesMediaFilters(asset, annotation, filters)).toBe(false)
  })

  it('applies known and unknown duration ranges', () => {
    const filters = { searchQuery: '', folderFilter: null, favoritesOnly: false, untaggedOnly: false, selectedTagIds: [] }
    expect(matchesMediaFilters({ ...asset, duration: 299.9 }, annotation, { ...filters, durationFilter: { mode: 'known', maximumSeconds: 300 } })).toBe(true)
    expect(matchesMediaFilters({ ...asset, duration: 300 }, annotation, { ...filters, durationFilter: { mode: 'known', maximumSeconds: 300 } })).toBe(false)
    expect(matchesMediaFilters(asset, annotation, { ...filters, durationFilter: { mode: 'unknown' } })).toBe(true)
  })
})
