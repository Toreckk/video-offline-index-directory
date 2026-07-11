export type CollectionGroupOperator = 'and' | 'or'

export type CollectionTagRule = {
  id: string
  kind: 'tag'
  tagId: string
  negated: boolean
}

export type CollectionWatchedRule = {
  id: string
  kind: 'watched'
  value: 'watched' | 'unwatched'
}

export type CollectionRuleGroup = {
  id: string
  kind: 'group'
  operator: CollectionGroupOperator
  negated: boolean
  children: CollectionRuleNode[]
}

export type CollectionRuleNode =
  | CollectionTagRule
  | CollectionWatchedRule
  | CollectionRuleGroup

export type SmartCollectionRules = {
  root: CollectionRuleGroup
}

export type SmartCollection = {
  id: string
  name: string
  rules: SmartCollectionRules
  createdAt: number
  updatedAt: number
}

export function createCollectionRuleId() {
  return `rule_${crypto.randomUUID()}`
}

export function createEmptyCollectionRules(): SmartCollectionRules {
  return {
    root: {
      id: createCollectionRuleId(),
      kind: 'group',
      operator: 'and',
      negated: false,
      children: [],
    },
  }
}
