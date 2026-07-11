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
})
