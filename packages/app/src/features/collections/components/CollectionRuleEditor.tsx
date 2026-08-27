import { useMemo, useState } from 'react'
import { Brackets, Clock3, Eye, MoveRight, Plus, Tags, Trash2 } from 'lucide-react'
import type { TagDefinition } from '../../annotations/model/annotationTypes'
import { SearchableTagSelect } from '../../annotations/components/SearchableTagSelect'
import { ThemedSelect } from '../../../components/controls/ThemedSelect'
import {
  createCollectionRuleId,
  type CollectionGroupOperator,
  type CollectionRuleGroup,
  type CollectionRuleNode,
  type SmartCollectionRules,
} from '../model/collectionTypes'
import { DurationRangeEditor } from '../../media/components/DurationRangeEditor'
import type { DurationBounds } from '../../media/model/durationRange'
import {
  collectGroupOptions,
  describeCollectionRules,
  groupDirectRules,
  moveRuleToGroup,
  type CollectionGroupOption,
} from '../services/collectionRuleTree'

const MAX_GROUP_DEPTH = 4
const GROUP_OPERATOR_OPTIONS = [
  { value: 'and', label: 'All rules' },
  { value: 'or', label: 'Any rule' },
] as const

export function CollectionRuleEditor({ tags, durationBounds, value, onChange }: {
  tags: readonly TagDefinition[]
  durationBounds: DurationBounds | null
  value: SmartCollectionRules
  onChange: (rules: SmartCollectionRules) => void
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [groupingOperators, setGroupingOperators] = useState<Record<string, CollectionGroupOperator>>({})
  const groupOptions = useMemo(() => collectGroupOptions(value.root), [value.root])
  const logicPreview = useMemo(() => describeCollectionRules(value.root, tags), [tags, value.root])

  const updateNode = (id: string, update: (node: CollectionRuleNode) => CollectionRuleNode) => {
    onChange({ root: mapNode(value.root, id, update) as CollectionRuleGroup })
  }
  const removeNode = (id: string) => {
    setSelectedIds((current) => withoutIds(current, new Set([id])))
    onChange({ root: removeFromGroup(value.root, id) })
  }
  const toggleSelected = (id: string) => setSelectedIds((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const groupSelected = (parentGroupId: string, ids: ReadonlySet<string>, operator: CollectionGroupOperator) => {
    onChange({ root: groupDirectRules(value.root, parentGroupId, ids, operator, createCollectionRuleId()) })
    setSelectedIds((current) => withoutIds(current, ids))
  }
  const moveRule = (ruleId: string, targetGroupId: string) => {
    onChange({ root: moveRuleToGroup(value.root, ruleId, targetGroupId) })
    setSelectedIds((current) => withoutIds(current, new Set([ruleId])))
  }

  return (
    <div>
      <p className="mb-4 max-w-3xl text-sm leading-6 text-on-secondary">
        Build the filter as a sentence. Groups can match all or any rules; individual rules and whole nested groups can be excluded.
      </p>
      <div className="mb-4 border border-primary/25 bg-primary/5 px-4 py-3" aria-live="polite">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-primary-fixed-dim">Logic preview</span>
        <p className="mt-1 text-sm leading-6 text-white">{logicPreview}</p>
      </div>
      <RuleGroupEditor
        group={value.root}
        tags={tags}
        durationBounds={durationBounds}
        depth={0}
        isRoot
        selectedIds={selectedIds}
        groupingOperators={groupingOperators}
        groupOptions={groupOptions}
        onUpdate={updateNode}
        onRemove={removeNode}
        onToggleSelected={toggleSelected}
        onGroupingOperatorChange={(groupId, operator) => setGroupingOperators((current) => ({ ...current, [groupId]: operator }))}
        onGroupSelected={groupSelected}
        onMoveRule={moveRule}
      />
    </div>
  )
}

function RuleGroupEditor({ group, tags, durationBounds, depth, isRoot, selectedIds, groupingOperators, groupOptions, onUpdate, onRemove, onToggleSelected, onGroupingOperatorChange, onGroupSelected, onMoveRule }: {
  group: CollectionRuleGroup
  tags: readonly TagDefinition[]
  durationBounds: DurationBounds | null
  depth: number
  isRoot?: boolean
  selectedIds: ReadonlySet<string>
  groupingOperators: Readonly<Record<string, CollectionGroupOperator>>
  groupOptions: readonly CollectionGroupOption[]
  onUpdate: (id: string, update: (node: CollectionRuleNode) => CollectionRuleNode) => void
  onRemove: (id: string) => void
  onToggleSelected: (id: string) => void
  onGroupingOperatorChange: (groupId: string, operator: CollectionGroupOperator) => void
  onGroupSelected: (parentGroupId: string, ids: ReadonlySet<string>, operator: CollectionGroupOperator) => void
  onMoveRule: (ruleId: string, targetGroupId: string) => void
}) {
  const addChild = (child: CollectionRuleNode) => onUpdate(group.id, (node) => node.kind === 'group' ? { ...node, children: [...node.children, child] } : node)
  const firstTagId = tags[0]?.id
  const operatorLabel = group.operator === 'and' ? 'all' : 'any'
  const selectedDirectIds = new Set(group.children.filter((child) => child.kind !== 'group' && selectedIds.has(child.id)).map((child) => child.id))
  const groupingOperator = groupingOperators[group.id] ?? 'or'

  return (
    <section className={`border ${isRoot ? 'border-primary/30 bg-surface-dim/55 p-4' : 'ml-3 border-white/10 border-l-primary/55 bg-black/15 p-3'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Brackets size={17} className="text-primary-fixed-dim" />
        <span className="text-xs font-black uppercase tracking-wider text-on-secondary">{isRoot ? 'Include videos matching' : 'Nested group matching'}</span>
        <ThemedSelect ariaLabel="Group match operator" value={group.operator} onChange={(operator) => onUpdate(group.id, (node) => node.kind === 'group' ? { ...node, operator } : node)} className="w-32" options={GROUP_OPERATOR_OPTIONS} />
        {!isRoot && <button type="button" onClick={() => onUpdate(group.id, (node) => node.kind === 'group' ? { ...node, negated: !node.negated } : node)} className={`border px-3 py-2 text-xs font-black ${group.negated ? 'border-rose-400/50 bg-rose-500/15 text-rose-200' : 'border-white/10 text-on-secondary hover:text-white'}`} aria-pressed={group.negated}>{group.negated ? 'Exclude group' : 'Include group'}</button>}
        {!isRoot && <button type="button" onClick={() => onRemove(group.id)} className="ml-auto flex h-9 w-9 items-center justify-center text-on-secondary hover:text-rose-200" aria-label="Remove rule group"><Trash2 size={15} /></button>}
      </div>

      <div className="mt-3 space-y-2">
        {group.children.map((child) => child.kind === 'group'
          ? <RuleGroupEditor key={child.id} group={child} tags={tags} durationBounds={durationBounds} depth={depth + 1} selectedIds={selectedIds} groupingOperators={groupingOperators} groupOptions={groupOptions} onUpdate={onUpdate} onRemove={onRemove} onToggleSelected={onToggleSelected} onGroupingOperatorChange={onGroupingOperatorChange} onGroupSelected={onGroupSelected} onMoveRule={onMoveRule} />
          : <RuleRow key={child.id} node={child} tags={tags} durationBounds={durationBounds} parentGroupId={group.id} selected={selectedIds.has(child.id)} groupOptions={groupOptions} onUpdate={onUpdate} onRemove={onRemove} onToggleSelected={onToggleSelected} onMoveRule={onMoveRule} />)}
        {group.children.length === 0 && <p className="border border-dashed border-white/10 px-4 py-6 text-center text-xs text-on-secondary">No rules yet. This collection currently matches every video.</p>}
      </div>

      {selectedDirectIds.size >= 2 && <div className="mt-3 flex flex-wrap items-center gap-2 border border-primary/25 bg-primary/5 p-3">
        <span className="mr-auto text-xs font-bold text-primary-fixed-dim">{selectedDirectIds.size} rules selected in this group</span>
        <ThemedSelect ariaLabel="New group match operator" value={groupingOperator} onChange={(operator) => onGroupingOperatorChange(group.id, operator)} className="w-36" options={GROUP_OPERATOR_OPTIONS} />
        <button type="button" disabled={depth >= MAX_GROUP_DEPTH} onClick={() => onGroupSelected(group.id, selectedDirectIds, groupingOperator)} className="bg-primary px-3 py-2 text-xs font-black disabled:opacity-35">{depth >= MAX_GROUP_DEPTH ? 'Maximum group depth' : 'Group selected rules'}</button>
      </div>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!firstTagId} onClick={() => firstTagId && addChild({ id: createCollectionRuleId(), kind: 'tag', tagId: firstTagId, negated: false })} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-black disabled:opacity-35"><Tags size={14} />Add tag rule</button>
        <button type="button" onClick={() => addChild({ id: createCollectionRuleId(), kind: 'watched', value: 'watched' })} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-black"><Eye size={14} />Add watch rule</button>
        <button type="button" disabled={!durationBounds} onClick={() => durationBounds && addChild({ id: createCollectionRuleId(), kind: 'duration', range: { mode: 'known', minimumSeconds: durationBounds.minimumSeconds, maximumSeconds: durationBounds.maximumSeconds } })} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-black disabled:opacity-35"><Clock3 size={14} />Add duration rule</button>
      </div>
      <button type="button" disabled={depth >= MAX_GROUP_DEPTH} onClick={() => addChild({ id: createCollectionRuleId(), kind: 'group', operator: 'and', negated: false, children: [] })} className="mt-3 flex w-full items-center justify-center gap-2 border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-xs font-black text-primary-fixed-dim transition hover:border-primary/70 hover:bg-primary/10 disabled:opacity-35"><Plus size={15} />Add nested group</button>
      {group.children.length > 1 && <p className="mt-3 text-[11px] text-on-secondary">This group requires {operatorLabel} of its {group.children.length} rules to match{group.negated ? ', then excludes that result' : ''}.</p>}
    </section>
  )
}

function RuleRow({ node, tags, durationBounds, parentGroupId, selected, groupOptions, onUpdate, onRemove, onToggleSelected, onMoveRule }: {
  node: Exclude<CollectionRuleNode, CollectionRuleGroup>
  tags: readonly TagDefinition[]
  durationBounds: DurationBounds | null
  parentGroupId: string
  selected: boolean
  groupOptions: readonly CollectionGroupOption[]
  onUpdate: (id: string, update: (node: CollectionRuleNode) => CollectionRuleNode) => void
  onRemove: (id: string) => void
  onToggleSelected: (id: string) => void
  onMoveRule: (ruleId: string, targetGroupId: string) => void
}) {
  return (
    <div className={`flex flex-wrap items-end gap-2 border bg-surface-container p-3 ${selected ? 'border-primary/50' : 'border-white/8'}`}>
      <label className="mb-2.5 flex h-8 w-8 cursor-pointer items-center justify-center" title="Select this rule for bulk grouping">
        <input type="checkbox" checked={selected} onChange={() => onToggleSelected(node.id)} aria-label={`Select ${node.kind} rule`} className="h-4 w-4 accent-primary" />
      </label>
      <span className="mb-3 w-20 text-xs font-black uppercase tracking-wider text-on-secondary">{node.kind === 'tag' ? 'Tag' : node.kind === 'watched' ? 'Status' : 'Duration'}</span>
      {node.kind === 'tag' ? <>
        <ThemedSelect ariaLabel="Tag rule comparison" value={node.negated ? 'not' : 'has'} onChange={(comparison) => onUpdate(node.id, (current) => current.kind === 'tag' ? { ...current, negated: comparison === 'not' } : current)} className="h-11 w-36" options={[{ value: 'has', label: 'Has tag' }, { value: 'not', label: 'Does not have' }]} />
        <div className="min-w-56 flex-1"><SearchableTagSelect label="Tag" tags={tags} value={node.tagId} onChange={(tagId) => onUpdate(node.id, (current) => current.kind === 'tag' ? { ...current, tagId } : current)} /></div>
      </> : node.kind === 'watched' ? <ThemedSelect ariaLabel="Watch rule" value={node.value} onChange={(watchValue) => onUpdate(node.id, (current) => current.kind === 'watched' ? { ...current, value: watchValue } : current)} className="h-11 w-52" options={[{ value: 'watched', label: 'Is watched' }, { value: 'unwatched', label: 'Is unwatched' }]} /> : <DurationRangeEditor value={node.range} bounds={durationBounds} idPrefix={node.id} onChange={(range) => range && onUpdate(node.id, (current) => current.kind === 'duration' ? { ...current, range } : current)} />}
      {groupOptions.length > 1 && <ThemedSelect ariaLabel={`Move ${node.kind} rule to group`} value={parentGroupId} onChange={(targetGroupId) => onMoveRule(node.id, targetGroupId)} icon={<MoveRight size={14} />} className="mb-0.5 h-10 w-44" options={groupOptions} />}
      <button type="button" onClick={() => onRemove(node.id)} className="mb-0.5 flex h-10 w-10 items-center justify-center text-on-secondary hover:text-rose-200" aria-label="Remove rule"><Trash2 size={15} /></button>
    </div>
  )
}

function mapNode(node: CollectionRuleNode, id: string, update: (node: CollectionRuleNode) => CollectionRuleNode): CollectionRuleNode {
  if (node.id === id) return update(node)
  return node.kind === 'group' ? { ...node, children: node.children.map((child) => mapNode(child, id, update)) } : node
}

function removeFromGroup(group: CollectionRuleGroup, id: string): CollectionRuleGroup {
  return {
    ...group,
    children: group.children.filter((child) => child.id !== id).map((child) => child.kind === 'group' ? removeFromGroup(child, id) : child),
  }
}

function withoutIds(current: ReadonlySet<string>, ids: ReadonlySet<string>) {
  return new Set([...current].filter((id) => !ids.has(id)))
}
