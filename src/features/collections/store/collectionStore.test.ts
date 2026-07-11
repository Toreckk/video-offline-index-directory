import { describe, expect, it, vi } from 'vitest'
import { migrateCollectionState, normalizeRules } from './collectionStore'

vi.mock('../../../shared/persistence/idbStateStorage', () => ({
  idbStateStorage: {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  },
}))

describe('collectionStore migrations', () => {
  it('converts legacy fixed buckets without changing their meaning', () => {
    const rules = normalizeRules({ allTagIds: ['a'], anyTagIds: ['b', 'c'], notTagIds: ['d'], watched: 'watched' })
    expect(rules.root.operator).toBe('and')
    expect(rules.root.children.map((node) => node.kind)).toEqual(['tag', 'group', 'tag', 'watched'])
    expect(rules.root.children[1]).toMatchObject({ kind: 'group', operator: 'or' })
    expect(rules.root.children[2]).toMatchObject({ kind: 'tag', tagId: 'd', negated: true })
  })

  it('migrates persisted collections to expression trees', () => {
    const migrated = migrateCollectionState({ collectionsById: { old: { id: 'old', name: 'Old', rules: { allTagIds: ['a'], anyTagIds: [], notTagIds: [], watched: 'any' }, createdAt: 1, updatedAt: 1 } }, orderedCollectionIds: ['old'] })
    expect(migrated.collectionsById?.old?.rules).toHaveProperty('root')
  })
})
