import { useMemo, useState } from 'react'
import { Link2 } from 'lucide-react'
import { filterTags, selectTags } from '../services/tagCatalog'
import { useAnnotationStore } from '../store/annotationStore'
import { SearchableTagSelect } from './SearchableTagSelect'
import { TagSearchInput } from './TagSearchInput'

export function TagRelationsPanel() {
  const tagsById = useAnnotationStore((state) => state.tagsById)
  const orderedTagIds = useAnnotationStore((state) => state.orderedTagIds)
  const tagImplications = useAnnotationStore((state) => state.tagImplications)
  const setTagImplications = useAnnotationStore((state) => state.setTagImplications)
  const tags = useMemo(() => selectTags(tagsById, orderedTagIds), [orderedTagIds, tagsById])
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const linkedIds = sourceId ? tagImplications[sourceId] ?? [] : []
  const matches = useMemo(() => filterTags(tags.filter((tag) => tag.id !== sourceId), query).sort((a, b) => a.name.localeCompare(b.name)), [query, sourceId, tags])
  const toggle = (tagId: string) => {
    if (!sourceId) return
    try {
      setTagImplications(sourceId, linkedIds.includes(tagId) ? linkedIds.filter((id) => id !== tagId) : [...linkedIds, tagId])
      setError(null)
    } catch (relationError) { setError(relationError instanceof Error ? relationError.message : 'Could not link tags.') }
  }
  return <div className="p-5">
    <p className="mb-4 text-sm leading-6 text-on-secondary">When the trigger tag is assigned, VOID also adds every linked tag, including transitive links. Cycles are rejected. Removing a trigger does not remove previously implied tags.</p>
    <SearchableTagSelect label="Trigger tag" tags={tags} value={sourceId} onChange={(id) => { setSourceId(id); setQuery(''); setError(null) }} />
    {sourceId && <div className="mt-5">
      <div className="flex items-center justify-between gap-4"><span className="text-xs font-black uppercase tracking-wider text-on-secondary">Also add ({linkedIds.length})</span><div className="w-64"><TagSearchInput value={query} onChange={setQuery} /></div></div>
      {error && <p className="mt-3 text-xs text-red-200" role="alert">{error}</p>}
      <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
        {matches.map((tag) => { const linked = linkedIds.includes(tag.id); return <button key={tag.id} type="button" onClick={() => toggle(tag.id)} className={`flex items-center gap-3 border px-3 py-2 text-left text-sm ${linked ? 'border-primary/50 bg-primary/15' : 'border-white/8 hover:bg-white/5'}`} aria-pressed={linked}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} /><span className="min-w-0 flex-1 truncate">{tag.name}</span>{linked && <Link2 size={14} className="text-primary-fixed-dim" />}</button> })}
      </div>
    </div>}
  </div>
}
