import { describe, expect, it } from 'vitest'
import type { CollectionRuleGroup, CollectionRuleNode, SmartCollectionRules } from '../model/collectionTypes'
import { matchesCollectionRules } from './collectionMatcher'

describe('matchesCollectionRules', () => {
  const annotation = { favorite: false, tagIds: ['category-a', 'category-b'], updatedAt: 1 }
  const rules = (operator: 'and' | 'or', children: CollectionRuleNode[]): SmartCollectionRules => ({ root: group('root', operator, children) })
  const group = (id: string, operator: 'and' | 'or', children: CollectionRuleNode[], negated = false): CollectionRuleGroup => ({ id, kind: 'group', operator, negated, children })
  const tag = (id: string, tagId: string, negated = false): CollectionRuleNode => ({ id, kind: 'tag', tagId, negated })

  it('supports category A AND category B', () => {
    expect(matchesCollectionRules(annotation, undefined, rules('and', [tag('1', 'category-a'), tag('2', 'category-b')]))).toBe(true)
    expect(matchesCollectionRules(annotation, undefined, rules('and', [tag('1', 'category-a'), tag('2', 'category-c')]))).toBe(false)
  })

  it('supports category A AND NOT category C', () => {
    expect(matchesCollectionRules(annotation, undefined, rules('and', [tag('1', 'category-a'), tag('2', 'category-c', true)]))).toBe(true)
    expect(matchesCollectionRules(annotation, undefined, rules('and', [tag('1', 'category-a'), tag('2', 'category-b', true)]))).toBe(false)
  })

  it('supports category A OR category C', () => {
    expect(matchesCollectionRules(annotation, undefined, rules('or', [tag('1', 'category-a'), tag('2', 'category-c')]))).toBe(true)
  })

  it('supports nested and negated groups plus watch state', () => {
    const expression = rules('and', [
      group('nested', 'or', [tag('1', 'category-a'), tag('2', 'category-c')]),
      group('excluded', 'or', [tag('3', 'damaged'), tag('4', 'incomplete')], true),
      { id: 'watched', kind: 'watched', value: 'watched' },
    ])
    expect(matchesCollectionRules(annotation, { positionSeconds: 0, durationSeconds: 1, watched: true, lastPlayedAt: 1, playCount: 1 }, expression)).toBe(true)
  })
})
