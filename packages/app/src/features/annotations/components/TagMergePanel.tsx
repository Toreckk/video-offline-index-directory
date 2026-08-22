import { useMemo, useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { selectTags } from '../services/tagCatalog'
import { useAnnotationStore } from '../store/annotationStore'
import { SearchableTagSelect } from './SearchableTagSelect'

export function TagMergePanel() {
  const tagsById = useAnnotationStore((state) => state.tagsById)
  const orderedTagIds = useAnnotationStore((state) => state.orderedTagIds)
  const mergeTag = useAnnotationStore((state) => state.mergeTag)
  const createTag = useAnnotationStore((state) => state.createTag)
  const tags = useMemo(() => selectTags(tagsById, orderedTagIds), [orderedTagIds, tagsById])
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [newTargetName, setNewTargetName] = useState('')
  const [deleteSource, setDeleteSource] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const apply = () => {
    try {
      if (!sourceId) throw new Error('Choose the tag to migrate.')
      const destination = newTargetName.trim() ? createTag(newTargetName) : targetId ? tagsById[targetId] : undefined
      if (!destination) throw new Error('Choose an existing destination or enter a new tag name.')
      const sourceName = tagsById[sourceId]?.name ?? 'Source tag'
      const affected = mergeTag(sourceId, destination.id, deleteSource)
      setMessage(`${affected} ${affected === 1 ? 'video' : 'videos'} migrated from ${sourceName} to ${destination.name}.`)
      setSourceId(null); setTargetId(null); setNewTargetName('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not merge tags.')
    }
  }

  return <div className="p-5">
    <div className="grid gap-4 lg:grid-cols-[1fr_44px_1fr]">
      <SearchableTagSelect label="Move assignments from" tags={tags} value={sourceId} onChange={(id) => { setSourceId(id); if (targetId === id) setTargetId(null); setMessage(null) }} excludeTagId={targetId} />
      <div className="hidden items-end justify-center pb-3 lg:flex"><ArrowRightLeft size={18} className="text-primary-fixed-dim" /></div>
      <div className="space-y-3">
        <SearchableTagSelect label="Into existing tag" tags={tags} value={targetId} onChange={(id) => { setTargetId(id); setNewTargetName(''); setMessage(null) }} excludeTagId={sourceId} />
        <label><span className="text-xs font-bold text-on-secondary">Or create/reuse by name</span><input value={newTargetName} onChange={(event) => { setNewTargetName(event.target.value); if (event.target.value) setTargetId(null); setMessage(null) }} placeholder="New destination tag" className="mt-2 h-11 w-full border border-white/10 bg-surface-dim px-3 text-sm outline-none focus:border-primary/60" /></label>
      </div>
    </div>
    <label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" checked={deleteSource} onChange={(event) => setDeleteSource(event.target.checked)} className="h-4 w-4 accent-primary" />Delete the old tag after migration</label>
    <div className="mt-4 flex items-center gap-4"><button type="button" onClick={apply} disabled={!sourceId || (!targetId && !newTargetName.trim())} className="bg-primary px-5 py-3 text-sm font-black disabled:opacity-40">Migrate tag</button>{message && <p className="text-xs text-on-secondary" role="status">{message}</p>}</div>
  </div>
}
