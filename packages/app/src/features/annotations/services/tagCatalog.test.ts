import { describe, expect, it } from 'vitest'
import { buildTagPickerSections, buildTagUsageCounts, filterTags } from './tagCatalog'
import type { TagDefinition } from '../model/annotationTypes'

const tags: TagDefinition[] = [
  { id: 'assigned', name: 'Assigned', color: '#A78BFA', createdAt: 1 },
  { id: 'favorite', name: 'Favorite', color: '#FB7185', createdAt: 2 },
  { id: 'recent', name: 'Recent', color: '#F59E0B', createdAt: 3, lastUsedAt: 20 },
  { id: 'common', name: 'Common', color: '#A3E635', createdAt: 4 },
]

describe('tag catalog', () => {
  it('builds usage counts in one pass', () => {
    expect(buildTagUsageCounts({ one: { favorite: false, tagIds: ['common'], updatedAt: 1 }, two: { favorite: false, tagIds: ['common', 'recent'], updatedAt: 1 } })).toEqual({ common: 2, recent: 1 })
  })

  it('creates non-overlapping picker sections with assigned tags first', () => {
    const sections = buildTagPickerSections({ tags, assignedTagIds: ['assigned'], favoriteTagIds: ['favorite', 'assigned'], usageCounts: { common: 2 }, query: '' })
    expect(sections.map((section) => [section.id, section.tags.map((tag) => tag.id)])).toEqual([
      ['assigned', ['assigned']],
      ['favorites', ['favorite']],
      ['recent', ['recent']],
      ['all', ['common']],
    ])
  })

  it('searches case-insensitively without imposing vocabulary rules', () => {
    expect(filterTags(tags, 'coMM')).toMatchObject([{ id: 'common' }])
  })

  it('pins selected tags above search results even when they do not match the query', () => {
    const sections = buildTagPickerSections({ tags, assignedTagIds: ['assigned'], favoriteTagIds: [], usageCounts: {}, query: 'common', grouped: false, assignedLabel: 'Selected tags', pinAssignedDuringSearch: true })
    expect(sections.map((section) => [section.label, section.tags.map((tag) => tag.id)])).toEqual([
      ['Selected tags', ['assigned']],
      ['Search results', ['common']],
    ])
  })

  it('only returns matching tags while searching in quick add', () => {
    const sections = buildTagPickerSections({ tags, assignedTagIds: ['assigned'], favoriteTagIds: [], usageCounts: {}, query: 'common' })
    expect(sections).toMatchObject([{ id: 'search', tags: [{ id: 'common' }] }])
  })

  it('keeps selected explorer tags pinned after the search is cleared', () => {
    const sections = buildTagPickerSections({ tags, assignedTagIds: ['assigned'], favoriteTagIds: [], usageCounts: { common: 3 }, query: '', grouped: false, order: 'usage', assignedLabel: 'Selected tags' })
    expect(sections[0]).toMatchObject({ label: 'Selected tags', tags: [{ id: 'assigned' }] })
    expect(sections[1]?.tags.some((tag) => tag.id === 'assigned')).toBe(false)
  })

  it('orders quick-picker groups alphabetically and explorer filters by usage', () => {
    const extended = [...tags, { id: 'alpha-recent', name: 'Alpha recent', color: '#60A5FA' as const, createdAt: 5, lastUsedAt: 10 }]
    const quickSections = buildTagPickerSections({ tags: extended, assignedTagIds: [], favoriteTagIds: [], usageCounts: { common: 10, favorite: 2 }, query: '' })
    expect(quickSections.find((section) => section.id === 'recent')?.tags.map((tag) => tag.name)).toEqual(['Alpha recent', 'Recent'])
    const usageSections = buildTagPickerSections({ tags: extended, assignedTagIds: [], favoriteTagIds: [], usageCounts: { common: 10, favorite: 2 }, query: '', order: 'usage', grouped: false })
    expect(usageSections[0]?.tags.slice(0, 2).map((tag) => tag.id)).toEqual(['common', 'favorite'])
  })
})
