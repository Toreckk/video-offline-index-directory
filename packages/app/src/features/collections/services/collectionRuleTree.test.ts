import { describe, expect, it } from 'vitest'
import type { CollectionRuleGroup, CollectionRuleNode } from '../model/collectionTypes'
import {
  collectGroupOptions,
  groupDirectRules,
  moveRuleToGroup,
} from './collectionRuleTree'

describe('collectionRuleTree', () => {
  it('wraps selected direct rules in an Any group without disturbing siblings', () => {
    const root = group('root', 'and', [tag('a'), tag('b'), tag('c'), tag('e', true)])
    const result = groupDirectRules(root, 'root', new Set(['a', 'b', 'c']), 'or', 'nested')

    expect(result.children).toEqual([
      group('nested', 'or', [tag('a'), tag('b'), tag('c')]),
      tag('e', true),
    ])
  })

  it('moves one rule between existing groups', () => {
    const root = group('root', 'and', [
      tag('g'),
      group('nested', 'or', [tag('a'), tag('b')]),
    ])
    const result = moveRuleToGroup(root, 'g', 'nested')

    expect(result.children).toEqual([
      group('nested', 'or', [tag('a'), tag('b'), tag('g')]),
    ])
  })

  it('keeps a rule in place when the target group is unavailable', () => {
    const root = group('root', 'and', [tag('g')])
    expect(moveRuleToGroup(root, 'g', 'missing')).toBe(root)
  })

  it('labels nested groups by their visible position and operator', () => {
    const root = group('root', 'and', [
      group('nested', 'or', [tag('a'), tag('b'), tag('c')]),
      tag('g'),
      tag('e', true),
    ])
    expect(collectGroupOptions(root)).toEqual([
      { value: 'root', label: 'Root group (All)' },
      { value: 'nested', label: 'Group 1 (Any)' },
    ])
  })
})

function tag(id: string, negated = false): CollectionRuleNode {
  return { id, kind: 'tag', tagId: id, negated }
}

function group(id: string, operator: 'and' | 'or', children: CollectionRuleNode[]): CollectionRuleGroup {
  return { id, kind: 'group', operator, negated: false, children }
}
