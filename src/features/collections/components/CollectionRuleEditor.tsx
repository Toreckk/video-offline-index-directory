import { Brackets, Eye, Plus, Tags, Trash2 } from 'lucide-react'
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

const MAX_GROUP_DEPTH = 4

export function CollectionRuleEditor({ tags, value, onChange }: {
  tags: readonly TagDefinition[]
  value: SmartCollectionRules
  onChange: (rules: SmartCollectionRules) => void
}) {
  const updateNode = (id: string, update: (node: CollectionRuleNode) => CollectionRuleNode) => {
    onChange({ root: mapNode(value.root, id, update) as CollectionRuleGroup })
  }
  const removeNode = (id: string) => onChange({ root: removeFromGroup(value.root, id) })

  return (
    <div>
      <p className="mb-4 max-w-3xl text-sm leading-6 text-on-secondary">
        Build the filter as a sentence. Groups can match all or any rules; individual rules and whole nested groups can be excluded.
      </p>
      <RuleGroupEditor group={value.root} tags={tags} depth={0} isRoot onUpdate={updateNode} onRemove={removeNode} />
    </div>
  )
}

function RuleGroupEditor({ group, tags, depth, isRoot, onUpdate, onRemove }: {
  group: CollectionRuleGroup
  tags: readonly TagDefinition[]
  depth: number
  isRoot?: boolean
  onUpdate: (id: string, update: (node: CollectionRuleNode) => CollectionRuleNode) => void
  onRemove: (id: string) => void
}) {
  const addChild = (child: CollectionRuleNode) => onUpdate(group.id, (node) => node.kind === 'group' ? { ...node, children: [...node.children, child] } : node)
  const firstTagId = tags[0]?.id
  const operatorLabel = group.operator === 'and' ? 'all' : 'any'

  return (
    <section className={`border ${isRoot ? 'border-primary/30 bg-surface-dim/55 p-4' : 'border-white/10 bg-black/15 p-3'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Brackets size={17} className="text-primary-fixed-dim" />
        <span className="text-xs font-black uppercase tracking-wider text-on-secondary">{isRoot ? 'Include videos matching' : 'Nested group matching'}</span>
        <ThemedSelect ariaLabel="Group match operator" value={group.operator} onChange={(operator) => onUpdate(group.id, (node) => node.kind === 'group' ? { ...node, operator: operator as CollectionGroupOperator } : node)} className="w-32" options={[{ value: 'and', label: 'All rules' }, { value: 'or', label: 'Any rule' }]} />
        {!isRoot && <button type="button" onClick={() => onUpdate(group.id, (node) => node.kind === 'group' ? { ...node, negated: !node.negated } : node)} className={`border px-3 py-2 text-xs font-black ${group.negated ? 'border-rose-400/50 bg-rose-500/15 text-rose-200' : 'border-white/10 text-on-secondary hover:text-white'}`} aria-pressed={group.negated}>{group.negated ? 'Exclude group' : 'Include group'}</button>}
        {!isRoot && <button type="button" onClick={() => onRemove(group.id)} className="ml-auto flex h-9 w-9 items-center justify-center text-on-secondary hover:text-rose-200" aria-label="Remove rule group"><Trash2 size={15} /></button>}
      </div>

      <div className="mt-3 space-y-2">
        {group.children.map((child) => child.kind === 'group'
          ? <RuleGroupEditor key={child.id} group={child} tags={tags} depth={depth + 1} onUpdate={onUpdate} onRemove={onRemove} />
          : <RuleRow key={child.id} node={child} tags={tags} onUpdate={onUpdate} onRemove={onRemove} />)}
        {group.children.length === 0 && <p className="border border-dashed border-white/10 px-4 py-6 text-center text-xs text-on-secondary">No rules yet. This collection currently matches every video.</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!firstTagId} onClick={() => firstTagId && addChild({ id: createCollectionRuleId(), kind: 'tag', tagId: firstTagId, negated: false })} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-black disabled:opacity-35"><Tags size={14} />Add tag rule</button>
        <button type="button" onClick={() => addChild({ id: createCollectionRuleId(), kind: 'watched', value: 'watched' })} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-black"><Eye size={14} />Add watch rule</button>
        <button type="button" disabled={depth >= MAX_GROUP_DEPTH} onClick={() => addChild({ id: createCollectionRuleId(), kind: 'group', operator: 'and', negated: false, children: [] })} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-black disabled:opacity-35"><Plus size={14} />Add group</button>
      </div>
      {group.children.length > 1 && <p className="mt-3 text-[11px] text-on-secondary">This group requires {operatorLabel} of its {group.children.length} rules to match{group.negated ? ', then excludes that result' : ''}.</p>}
    </section>
  )
}

function RuleRow({ node, tags, onUpdate, onRemove }: {
  node: Exclude<CollectionRuleNode, CollectionRuleGroup>
  tags: readonly TagDefinition[]
  onUpdate: (id: string, update: (node: CollectionRuleNode) => CollectionRuleNode) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 border border-white/8 bg-surface-container p-3">
      <span className="mb-3 w-20 text-xs font-black uppercase tracking-wider text-on-secondary">{node.kind === 'tag' ? 'Tag' : 'Status'}</span>
      {node.kind === 'tag' ? <>
        <ThemedSelect ariaLabel="Tag rule comparison" value={node.negated ? 'not' : 'has'} onChange={(comparison) => onUpdate(node.id, (current) => current.kind === 'tag' ? { ...current, negated: comparison === 'not' } : current)} className="h-11 w-36" options={[{ value: 'has', label: 'Has tag' }, { value: 'not', label: 'Does not have' }]} />
        <div className="min-w-56 flex-1"><SearchableTagSelect label="Tag" tags={tags} value={node.tagId} onChange={(tagId) => onUpdate(node.id, (current) => current.kind === 'tag' ? { ...current, tagId } : current)} /></div>
      </> : <ThemedSelect ariaLabel="Watch rule" value={node.value} onChange={(watchValue) => onUpdate(node.id, (current) => current.kind === 'watched' ? { ...current, value: watchValue as 'watched' | 'unwatched' } : current)} className="h-11 w-52" options={[{ value: 'watched', label: 'Is watched' }, { value: 'unwatched', label: 'Is unwatched' }]} />}
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
