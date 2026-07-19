import { useMemo, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import {
  MAX_TAG_NAME_LENGTH,
  pickDistinctTagColor,
  useAnnotationStore,
} from '../store/annotationStore'
import { buildTagPickerSections, buildTagUsageCounts, selectTags } from '../services/tagCatalog'
import { TagPickerList } from './TagPickerList'
import { TagSearchInput } from './TagSearchInput'

const EMPTY_TAG_IDS: string[] = []

export function MediaTagEditor({ mediaId, spacious = false }: { mediaId: string; spacious?: boolean }) {
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
  const tags = useMemo(() => selectTags(tagsById, orderedTagIds), [orderedTagIds, tagsById])
  const assignedTagIds = annotation?.tagIds ?? EMPTY_TAG_IDS
  const usageCounts = useMemo(() => buildTagUsageCounts(annotationsByMediaId), [annotationsByMediaId])
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
    <div className="flex h-full min-h-0 flex-col text-left">
      <div className={spacious ? 'px-5 pt-5' : ''}>
        <h3 className={spacious ? 'text-lg font-black' : 'text-sm font-black'}>Video tags</h3>
        <p className="mt-1 text-xs leading-5 text-on-secondary">
          Search, create, and organize tags without leaving the video.
        </p>
        <div className="mt-4"><TagSearchInput value={tagSearch} onChange={setTagSearch} /></div>
        <form onSubmit={handleCreate} className="mt-3 border border-white/7 bg-surface-dim/60 p-3">
          <label className="text-xs font-bold text-on-secondary">Quick create or add existing</label>
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
          <div className="mt-2 flex justify-between gap-3 text-[10px] text-on-secondary">
            <span>{error ?? 'Matching names reuse and assign the existing tag.'}</span>
            <span className="shrink-0">{tagName.length}/{MAX_TAG_NAME_LENGTH}</span>
          </div>
        </form>
      </div>
      <div className={`min-h-0 flex-1 overflow-y-auto pr-1 ${spacious ? 'mt-4 px-5 pb-5' : 'mt-4 max-h-64'}`}>
        {tags.length === 0 ? (
          <p className="py-3 text-center text-xs text-on-secondary">No tags yet. Create the first one above.</p>
        ) : (
          <TagPickerList
            sections={sections}
            selectedTagIds={assignedTagIds}
            favoriteTagIds={favoriteTagIds}
            usageCounts={usageCounts}
            onToggle={(tagId) => toggleMediaTag(mediaId, tagId)}
            onToggleFavorite={toggleTagFavorite}
            initiallyCollapsedSectionIds={spacious ? [] : ['assigned']}
          />
        )}
      </div>
    </div>
  )
}
