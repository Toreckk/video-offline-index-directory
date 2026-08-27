import type { TagDefinition } from '../../annotations/model/annotationTypes'
import { describeDurationRange } from '../../media/model/durationRange'
import type {
  CollectionGroupOperator,
  CollectionRuleGroup,
  CollectionRuleNode,
} from '../model/collectionTypes'

export type CollectionGroupOption = {
  value: string
  label: string
}

export function groupDirectRules(
  root: CollectionRuleGroup,
  parentGroupId: string,
  ruleIds: ReadonlySet<string>,
  operator: CollectionGroupOperator,
  newGroupId: string,
) {
  if (ruleIds.size < 2) return root
  return mapGroup(root, (group) => {
    if (group.id !== parentGroupId) return group
    const selected = group.children.filter(
      (child) => child.kind !== 'group' && ruleIds.has(child.id),
    )
    if (selected.length < 2) return group
    const firstSelectedIndex = group.children.findIndex((child) => ruleIds.has(child.id))
    const remaining = group.children.filter((child) => !ruleIds.has(child.id))
    const nestedGroup: CollectionRuleGroup = {
      id: newGroupId,
      kind: 'group',
      operator,
      negated: false,
      children: selected,
    }
    remaining.splice(firstSelectedIndex, 0, nestedGroup)
    return { ...group, children: remaining }
  })
}

export function moveRuleToGroup(
  root: CollectionRuleGroup,
  ruleId: string,
  targetGroupId: string,
) {
  const rule = findRule(root, ruleId)
  if (!rule || rule.kind === 'group' || !findGroup(root, targetGroupId) || findParentGroupId(root, ruleId) === targetGroupId) return root
  const withoutRule = removeRule(root, ruleId)
  return mapGroup(withoutRule, (group) => group.id === targetGroupId
    ? { ...group, children: [...group.children, rule] }
    : group)
}

export function collectGroupOptions(root: CollectionRuleGroup): CollectionGroupOption[] {
  const options: CollectionGroupOption[] = []
  const visit = (group: CollectionRuleGroup, path: number[]) => {
    const operator = group.operator === 'and' ? 'All' : 'Any'
    options.push({
      value: group.id,
      label: path.length === 0 ? `Root group (${operator})` : `Group ${path.join('.')} (${operator})`,
    })
    let nestedIndex = 0
    group.children.forEach((child) => {
      if (child.kind !== 'group') return
      nestedIndex += 1
      visit(child, [...path, nestedIndex])
    })
  }
  visit(root, [])
  return options
}

export function describeCollectionRules(root: CollectionRuleGroup, tags: readonly TagDefinition[]) {
  const tagNames = new Map(tags.map((tag) => [tag.id, tag.name]))
  return describeNode(root, tagNames, true)
}

function describeNode(node: CollectionRuleNode, tagNames: ReadonlyMap<string, string>, isRoot = false): string {
  if (node.kind === 'tag') {
    const name = tagNames.get(node.tagId) ?? 'Missing tag'
    return node.negated ? `does not have “${name}”` : `has “${name}”`
  }
  if (node.kind === 'watched') return node.value === 'watched' ? 'is watched' : 'is unwatched'
  if (node.kind === 'duration') return `duration is ${describeDurationRange(node.range)}`
  if (node.children.length === 0) return node.negated ? 'no videos' : 'all videos'
  const separator = node.operator === 'and' ? ' AND ' : ' OR '
  const expression = node.children.map((child) => describeNode(child, tagNames)).join(separator)
  const grouped = isRoot && !node.negated ? expression : `(${expression})`
  return node.negated ? `NOT ${grouped}` : grouped
}

function mapGroup(group: CollectionRuleGroup, update: (group: CollectionRuleGroup) => CollectionRuleGroup): CollectionRuleGroup {
  const withMappedChildren = {
    ...group,
    children: group.children.map((child) => child.kind === 'group' ? mapGroup(child, update) : child),
  }
  return update(withMappedChildren)
}

function findRule(group: CollectionRuleGroup, id: string): CollectionRuleNode | undefined {
  for (const child of group.children) {
    if (child.id === id) return child
    if (child.kind === 'group') {
      const match = findRule(child, id)
      if (match) return match
    }
  }
}

function findGroup(group: CollectionRuleGroup, id: string): CollectionRuleGroup | undefined {
  if (group.id === id) return group
  for (const child of group.children) {
    if (child.kind !== 'group') continue
    const match = findGroup(child, id)
    if (match) return match
  }
}

function findParentGroupId(group: CollectionRuleGroup, id: string): string | undefined {
  if (group.children.some((child) => child.id === id)) return group.id
  for (const child of group.children) {
    if (child.kind !== 'group') continue
    const match = findParentGroupId(child, id)
    if (match) return match
  }
}

function removeRule(group: CollectionRuleGroup, id: string): CollectionRuleGroup {
  return {
    ...group,
    children: group.children
      .filter((child) => child.id !== id)
      .map((child) => child.kind === 'group' ? removeRule(child, id) : child),
  }
}
