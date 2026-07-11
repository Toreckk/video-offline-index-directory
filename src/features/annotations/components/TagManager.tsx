import { useMemo, useState, type FormEvent } from 'react'
import { Plus, Tag } from 'lucide-react'
import {
  MAX_TAG_NAME_LENGTH,
  pickDistinctTagColor,
  useAnnotationStore,
  type TagColor,
} from '../store/annotationStore'
import { buildTagUsageCounts, filterTags, selectTags, sortTagsForManagement, type TagManagementSort } from '../services/tagCatalog'
import { TagSearchInput } from './TagSearchInput'
import { TagColorSelect } from './TagColorSelect'
import { ManagedTagRow } from './ManagedTagRow'
import { ThemedSelect } from '../../../components/controls/ThemedSelect'

const TAG_PAGE_SIZE = 50
type TagScope = 'all' | 'favorites' | 'unused'

export function TagManager() {
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState<TagColor | 'auto'>('auto')
  const [error, setError] = useState<string | null>(null)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [scope, setScope] = useState<TagScope>('all')
  const [sort, setSort] = useState<TagManagementSort>('name')
  const [visibleLimit, setVisibleLimit] = useState(TAG_PAGE_SIZE)
  const tagsById = useAnnotationStore((state) => state.tagsById)
  const orderedTagIds = useAnnotationStore((state) => state.orderedTagIds)
  const annotationsByMediaId = useAnnotationStore(
    (state) => state.annotationsByMediaId,
  )
  const favoriteTagIds = useAnnotationStore((state) => state.favoriteTagIds)
  const createTag = useAnnotationStore((state) => state.createTag)
  const renameTag = useAnnotationStore((state) => state.renameTag)
  const updateTagColor = useAnnotationStore((state) => state.updateTagColor)
  const deleteTag = useAnnotationStore((state) => state.deleteTag)
  const toggleTagFavorite = useAnnotationStore((state) => state.toggleTagFavorite)
  const tags = useMemo(
    () => selectTags(tagsById, orderedTagIds),
    [orderedTagIds, tagsById],
  )
  const usageCounts = useMemo(
    () => buildTagUsageCounts(annotationsByMediaId),
    [annotationsByMediaId],
  )
  const matchingTags = useMemo(
    () => sortTagsForManagement(
      filterTags(tags, catalogSearch).filter((tag) => {
        if (scope === 'favorites') return favoriteTagIds.includes(tag.id)
        if (scope === 'unused') return (usageCounts[tag.id] ?? 0) === 0
        return true
      }),
      usageCounts,
      sort,
    ),
    [catalogSearch, favoriteTagIds, scope, sort, tags, usageCounts],
  )
  const visibleTags = matchingTags.slice(0, visibleLimit)
  const assignedTagCount = tags.filter((tag) => (usageCounts[tag.id] ?? 0) > 0).length
  const unusedTagCount = tags.length - assignedTagCount
  const automaticColor = pickDistinctTagColor(tags, name || 'new tag')

  const handleCreate = (event: FormEvent) => {
    event.preventDefault()
    try {
      createTag(name, selectedColor === 'auto' ? undefined : selectedColor)
      setName('')
      setSelectedColor('auto')
      setError(null)
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'Could not create tag.',
      )
    }
  }

  return (
    <div className="p-5">
      <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <label>
          <span className="text-xs font-bold text-on-secondary">Tag name</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            maxLength={MAX_TAG_NAME_LENGTH}
            placeholder="e.g. christmas or year:2025"
            className="mt-2 h-11 w-full border border-white/10 bg-surface-dim px-3 text-sm outline-none focus:border-primary/60"
          />
        </label>
        <label>
          <span className="text-xs font-bold text-on-secondary">Color</span>
          <span className="mt-2 flex h-11 items-center gap-2 border border-white/10 bg-surface-dim px-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  selectedColor === 'auto' ? automaticColor : selectedColor,
              }}
            />
            <TagColorSelect value={selectedColor} onChange={setSelectedColor} allowAutomatic className="min-w-0 flex-1 bg-transparent text-sm" />
          </span>
        </label>
        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-auto flex h-11 items-center justify-center gap-2 bg-primary px-5 text-sm font-black disabled:opacity-40"
        >
          <Plus size={17} /> Create
        </button>
      </form>
      <div className="mt-2 flex justify-between text-[11px] text-on-secondary">
        <span>{error ?? 'Names are unique regardless of capitalization.'}</span>
        <span>{name.length}/{MAX_TAG_NAME_LENGTH}</span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/7 pt-5">
        <div className="min-w-64 flex-1"><TagSearchInput value={catalogSearch} onChange={(value) => { setCatalogSearch(value); setVisibleLimit(TAG_PAGE_SIZE) }} /></div>
        <ThemedSelect ariaLabel="Sort managed tags" value={sort} onChange={(value) => { setSort(value); setVisibleLimit(TAG_PAGE_SIZE) }} className="w-44" options={[{ value: 'name', label: 'Name' }, { value: 'usage', label: 'Most used' }, { value: 'recent', label: 'Recently used' }]} />
      </div>

      <div className="mt-4 grid gap-px bg-white/7 sm:grid-cols-4">
        <CatalogStat label="Total" value={tags.length} />
        <CatalogStat label="In use" value={assignedTagCount} />
        <CatalogStat label="Unused" value={unusedTagCount} />
        <CatalogStat label="Favorites" value={favoriteTagIds.length} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {([['all', 'All tags'], ['favorites', 'Favorites'], ['unused', 'Unused']] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => { setScope(value); setVisibleLimit(TAG_PAGE_SIZE) }} className={`border px-3 py-2 text-xs font-black uppercase tracking-wider ${scope === value ? 'border-primary/50 bg-primary/15 text-primary-fixed-dim' : 'border-white/8 text-on-secondary hover:text-white'}`} aria-pressed={scope === value}>{label}</button>
        ))}
        <span className="ml-auto text-xs font-bold text-on-secondary">Showing {visibleTags.length} of {matchingTags.length} matches</span>
      </div>

      <div className="mt-4 max-h-[38rem] space-y-2 overflow-y-auto pr-1">
        {tags.length === 0 ? (
          <div className="flex items-center justify-center gap-3 border border-dashed border-white/10 py-7 text-sm text-on-secondary">
            <Tag size={18} /> No tags created yet.
          </div>
        ) : matchingTags.length === 0 ? (
          <div className="flex items-center justify-center border border-dashed border-white/10 py-7 text-sm text-on-secondary">
            No tags match that search.
          </div>
        ) : (
          visibleTags.map((tag) => <ManagedTagRow key={tag.id} tag={tag} usageCount={usageCounts[tag.id] ?? 0} isFavorite={favoriteTagIds.includes(tag.id)} onRename={(nextName) => renameTag(tag.id, nextName)} onColorChange={(color) => updateTagColor(tag.id, color)} onToggleFavorite={() => toggleTagFavorite(tag.id)} onDelete={() => deleteTag(tag.id)} />)
        )}
      </div>
      {visibleTags.length < matchingTags.length && <button type="button" onClick={() => setVisibleLimit((current) => current + TAG_PAGE_SIZE)} className="mt-4 w-full border border-dashed border-white/10 py-3 text-sm font-bold text-on-secondary hover:text-white">Load {Math.min(TAG_PAGE_SIZE, matchingTags.length - visibleTags.length)} more tags</button>}
    </div>
  )
}

function CatalogStat({ label, value }: { label: string; value: number }) {
  return <div className="bg-surface-container px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-on-secondary">{label}</p><p className="mt-1 text-xl font-black tabular-nums">{value}</p></div>
}
