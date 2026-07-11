import { useMemo, useState, type FormEvent, type RefObject } from 'react'
import { Plus, Tags } from 'lucide-react'
import {
  MAX_TAG_NAME_LENGTH,
  pickDistinctTagColor,
  useAnnotationStore,
} from '../store/annotationStore'
import { PopoverPortal } from '../../../components/controls/PopoverPortal'
import { useDismissiblePopover } from '../../../components/controls/useDismissiblePopover'
import { buildTagPickerSections, buildTagUsageCounts, selectTags } from '../services/tagCatalog'
import { TagSearchInput } from './TagSearchInput'
import { TagPickerList } from './TagPickerList'

type MediaTagMenuProps = {
  mediaId: string
  align?: 'left' | 'right'
  compact?: boolean
}

const EMPTY_TAG_IDS: string[] = []

export function MediaTagMenu({ mediaId, align = 'right', compact = false }: MediaTagMenuProps) {
  const { isOpen, triggerRef, panelRef, toggle } = useDismissiblePopover()
  const [tagName, setTagName] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const annotation = useAnnotationStore((state) => state.annotationsByMediaId[mediaId])
  const tagsById = useAnnotationStore((state) => state.tagsById)
  const orderedTagIds = useAnnotationStore((state) => state.orderedTagIds)
  const annotationsByMediaId = useAnnotationStore((state) => state.annotationsByMediaId)
  const favoriteTagIds = useAnnotationStore((state) => state.favoriteTagIds)
  const createTag = useAnnotationStore((state) => state.createTag)
  const addMediaTag = useAnnotationStore((state) => state.addMediaTag)
  const toggleMediaTag = useAnnotationStore((state) => state.toggleMediaTag)
  const toggleTagFavorite = useAnnotationStore((state) => state.toggleTagFavorite)
  const tags = useMemo(
    () => selectTags(tagsById, orderedTagIds),
    [orderedTagIds, tagsById],
  )
  const assignedTagIds = annotation?.tagIds ?? EMPTY_TAG_IDS
  const usageCounts = useMemo(
    () => buildTagUsageCounts(annotationsByMediaId),
    [annotationsByMediaId],
  )
  const sections = useMemo(
    () => buildTagPickerSections({ tags, assignedTagIds, favoriteTagIds, usageCounts, query: tagSearch }),
    [assignedTagIds, favoriteTagIds, tagSearch, tags, usageCounts],
  )
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
    <div onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef as RefObject<HTMLButtonElement>}
        data-void-popover-trigger
        type="button"
        onClick={toggle}
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
        <PopoverPortal anchorRef={triggerRef} panelRef={panelRef} width={320} align={align} className="border border-white/10 bg-surface-container-high p-4 text-left">
          <h3 className="text-sm font-black">Video tags</h3>
          <p className="mt-1 text-xs leading-5 text-on-secondary">Add existing tags or create one without leaving the video.</p>
          <div className="mt-4"><TagSearchInput value={tagSearch} onChange={setTagSearch} /></div>
          <div className="mt-4 max-h-64 overflow-y-auto pr-1">
            {tags.length === 0 ? (
              <p className="py-3 text-center text-xs text-on-secondary">No tags yet. Create the first one below.</p>
            ) : <TagPickerList sections={sections} selectedTagIds={assignedTagIds} favoriteTagIds={favoriteTagIds} usageCounts={usageCounts} onToggle={(tagId) => toggleMediaTag(mediaId, tagId)} onToggleFavorite={toggleTagFavorite} />}
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
        </PopoverPortal>
      )}
    </div>
  )
}
