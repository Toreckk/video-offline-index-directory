import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { idbStateStorage } from '../../../shared/persistence/idbStateStorage'
import {
  createCollectionRuleId,
  type CollectionRuleGroup,
  type CollectionRuleNode,
  type SmartCollection,
  type SmartCollectionRules,
} from '../model/collectionTypes'

type CollectionState = {
  collectionsById: Record<string, SmartCollection>
  orderedCollectionIds: string[]
  isHydrated: boolean
}

type CollectionActions = {
  createCollection: (name: string, rules: SmartCollectionRules) => SmartCollection
  updateCollection: (id: string, name: string, rules: SmartCollectionRules) => void
  deleteCollection: (id: string) => void
}

export const useCollectionStore = create<CollectionState & CollectionActions>()(
  persist(
    (set, get) => ({
      collectionsById: {}, orderedCollectionIds: [], isHydrated: false,
      createCollection: (rawName, rules) => {
        const name = rawName.trim().replace(/\s+/g, ' ')
        if (!name) throw new Error('Collection name cannot be empty.')
        if (name.length > 64) throw new Error('Collection names can contain at most 64 characters.')
        if (get().orderedCollectionIds.some((id) => get().collectionsById[id]?.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('A collection with that name already exists.')
        const now = Date.now()
        const collection: SmartCollection = { id: `collection_${crypto.randomUUID()}`, name, rules: normalizeRules(rules), createdAt: now, updatedAt: now }
        set((state) => ({ collectionsById: { ...state.collectionsById, [collection.id]: collection }, orderedCollectionIds: [...state.orderedCollectionIds, collection.id] }))
        return collection
      },
      updateCollection: (id, rawName, rules) => {
        const name = rawName.trim().replace(/\s+/g, ' ')
        if (!name) throw new Error('Collection name cannot be empty.')
        if (name.length > 64) throw new Error('Collection names can contain at most 64 characters.')
        if (get().orderedCollectionIds.some((collectionId) => collectionId !== id && get().collectionsById[collectionId]?.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('A collection with that name already exists.')
        const existing = get().collectionsById[id]
        if (!existing) throw new Error('Collection no longer exists.')
        set((state) => ({ collectionsById: { ...state.collectionsById, [id]: { ...existing, name, rules: normalizeRules(rules), updatedAt: Date.now() } } }))
      },
      deleteCollection: (id) => set((state) => { const collectionsById = { ...state.collectionsById }; delete collectionsById[id]; return { collectionsById, orderedCollectionIds: state.orderedCollectionIds.filter((item) => item !== id) } }),
    }),
    {
      name: 'void-collections-store',
      storage: createJSONStorage(() => idbStateStorage),
      partialize: (state) => ({ collectionsById: state.collectionsById, orderedCollectionIds: state.orderedCollectionIds }),
      version: 2,
      migrate: (persistedState) => migrateCollectionState(persistedState),
      onRehydrateStorage: () => () => useCollectionStore.setState({ isHydrated: true }),
    },
  ),
)

type LegacySmartCollectionRules = {
  allTagIds?: string[]
  anyTagIds?: string[]
  notTagIds?: string[]
  watched?: 'any' | 'watched' | 'unwatched'
}

type PersistedCollectionState = Partial<CollectionState> & {
  collectionsById?: Record<string, SmartCollection & { rules: SmartCollectionRules | LegacySmartCollectionRules }>
}

export function migrateCollectionState(persistedState: unknown) {
  const state = (persistedState ?? {}) as PersistedCollectionState
  const collectionsById = Object.fromEntries(
    Object.entries(state.collectionsById ?? {}).map(([id, collection]) => [
      id,
      { ...collection, rules: normalizeRules(collection.rules) },
    ]),
  )
  return { ...state, collectionsById }
}

export function normalizeRules(rules: SmartCollectionRules | LegacySmartCollectionRules): SmartCollectionRules {
  if ('root' in rules && rules.root?.kind === 'group') {
    return { root: normalizeGroup(rules.root, 0) }
  }

  const legacyRules = rules as LegacySmartCollectionRules
  const children: CollectionRuleNode[] = []
  for (const tagId of new Set(legacyRules.allTagIds ?? [])) children.push(createTagRule(tagId, false))
  const anyTags = [...new Set(legacyRules.anyTagIds ?? [])]
  if (anyTags.length > 0) {
    children.push({
      id: createCollectionRuleId(),
      kind: 'group',
      operator: 'or',
      negated: false,
      children: anyTags.map((tagId) => createTagRule(tagId, false)),
    })
  }
  for (const tagId of new Set(legacyRules.notTagIds ?? [])) children.push(createTagRule(tagId, true))
  if (legacyRules.watched && legacyRules.watched !== 'any') {
    children.push({ id: createCollectionRuleId(), kind: 'watched', value: legacyRules.watched })
  }
  return { root: { id: createCollectionRuleId(), kind: 'group', operator: 'and', negated: false, children } }
}

function createTagRule(tagId: string, negated: boolean): CollectionRuleNode {
  return { id: createCollectionRuleId(), kind: 'tag', tagId, negated }
}

function normalizeGroup(group: CollectionRuleGroup, depth: number): CollectionRuleGroup {
  if (depth > 4) throw new Error('Collection rule groups can be nested up to four levels deep.')
  const children = group.children.slice(0, 100).map((child) => {
    if (child.kind === 'group') return normalizeGroup(child, depth + 1)
    if (child.kind === 'tag') return { ...child, tagId: child.tagId.trim() }
    return { ...child }
  }).filter((child) => child.kind !== 'tag' || child.tagId.length > 0)
  return { ...group, operator: group.operator === 'or' ? 'or' : 'and', negated: group.negated === true, children }
}
