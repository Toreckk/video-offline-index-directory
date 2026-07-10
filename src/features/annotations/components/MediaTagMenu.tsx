import { useMemo, useState, type FormEvent } from 'react'
import { Plus, Tags } from 'lucide-react'
import {
  MAX_TAG_NAME_LENGTH,
  pickDistinctTagColor,
  useAnnotationStore,
} from '../store/annotationStore'

type MediaTagMenuProps = {
  mediaId: string
  align?: 'left' | 'right'
  compact?: boolean
}

export function MediaTagMenu({ mediaId, align = 'right', compact = false }: MediaTagMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tagName, setTagName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const annotation = useAnnotationStore((state) => state.annotationsByMediaId[mediaId])
  const tagsById = useAnnotationStore((state) => state.tagsById)
  const orderedTagIds = useAnnotationStore((state) => state.orderedTagIds)
  const createTag = useAnnotationStore((state) => state.createTag)
  const addMediaTag = useAnnotationStore((state) => state.addMediaTag)
  const toggleMediaTag = useAnnotationStore((state) => state.toggleMediaTag)
  const tags = useMemo(
    () => orderedTagIds.flatMap((id) => tagsById[id] ? [tagsById[id]] : []),
    [orderedTagIds, tagsById],
  )
  const assignedTagIds = annotation?.tagIds ?? []
  const suggestedColor = pickDistinctTagColor(tags, tagName || 'new tag')

  const handleCreate = (event: FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    try {
      const tag = createTag(tagName)
      addMediaTag(mediaId, tag.id)
      setTagName('')
      setError(null)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create tag.')
    }
  }

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`relative flex items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur transition hover:bg-black/85 ${compact ? 'h-9 w-9' : 'h-10 w-10'}`}
        aria-label="Manage video tags"
        aria-expanded={isOpen}
      >
        <Tags size={compact ? 16 : 18} />
        {assignedTagIds.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black">
            {assignedTagIds.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute top-12 z-40 w-80 border border-white/10 bg-surface-container-high p-4 text-left shadow-2xl ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <h3 className="text-sm font-black">Video tags</h3>
          <p className="mt-1 text-xs leading-5 text-on-secondary">Add existing tags or create one without leaving the video.</p>
          <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
            {tags.length === 0 ? (
              <p className="py-3 text-center text-xs text-on-secondary">No tags yet. Create the first one below.</p>
            ) : tags.map((tag) => {
              const assigned = assignedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleMediaTag(mediaId, tag.id)}
                  className="flex w-full items-center gap-3 border px-3 py-2 text-left text-sm"
                  style={{ borderColor: assigned ? tag.color : `${tag.color}44`, backgroundColor: assigned ? `${tag.color}24` : 'transparent' }}
                  aria-pressed={assigned}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                  <span className="text-xs text-on-secondary">{assigned ? 'Added' : 'Add'}</span>
                </button>
              )
            })}
          </div>
          <form onSubmit={handleCreate} className="mt-4 border-t border-white/7 pt-4">
            <label className="text-xs font-bold text-on-secondary">Quick create</label>
            <div className="mt-2 flex gap-2">
              <span className="mt-3 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: suggestedColor }} />
              <input
                value={tagName}
                onChange={(event) => { setTagName(event.target.value); setError(null) }}
                maxLength={MAX_TAG_NAME_LENGTH}
                placeholder="e.g. year:2025"
                className="min-w-0 flex-1 border border-white/10 bg-surface-dim px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              <button type="submit" disabled={!tagName.trim()} className="flex h-10 w-10 items-center justify-center bg-primary text-white disabled:opacity-40" aria-label="Create and add tag">
                <Plus size={17} />
              </button>
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-on-secondary">
              <span>{error ?? 'Color is selected automatically.'}</span>
              <span>{tagName.length}/{MAX_TAG_NAME_LENGTH}</span>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
