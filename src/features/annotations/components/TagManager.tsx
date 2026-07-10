import { useMemo, useState, type FormEvent } from 'react'
import { Plus, Tag, Trash2 } from 'lucide-react'
import {
  MAX_TAG_NAME_LENGTH,
  TAG_COLOR_OPTIONS,
  pickDistinctTagColor,
  useAnnotationStore,
  type TagColor,
} from '../store/annotationStore'

export function TagManager() {
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState<TagColor | 'auto'>('auto')
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const tagsById = useAnnotationStore((state) => state.tagsById)
  const orderedTagIds = useAnnotationStore((state) => state.orderedTagIds)
  const annotationsByMediaId = useAnnotationStore(
    (state) => state.annotationsByMediaId,
  )
  const createTag = useAnnotationStore((state) => state.createTag)
  const updateTagColor = useAnnotationStore((state) => state.updateTagColor)
  const deleteTag = useAnnotationStore((state) => state.deleteTag)
  const tags = useMemo(
    () =>
      orderedTagIds.flatMap((tagId) => {
        const tag = tagsById[tagId]
        return tag ? [tag] : []
      }),
    [orderedTagIds, tagsById],
  )
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
            <select
              value={selectedColor}
              onChange={(event) =>
                setSelectedColor(event.target.value as TagColor | 'auto')
              }
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            >
              <option value="auto">Automatic</option>
              {TAG_COLOR_OPTIONS.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>
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

      <div className="mt-6 space-y-2">
        {tags.length === 0 ? (
          <div className="flex items-center justify-center gap-3 border border-dashed border-white/10 py-7 text-sm text-on-secondary">
            <Tag size={18} /> No tags created yet.
          </div>
        ) : (
          tags.map((tag) => {
            const usageCount = Object.values(annotationsByMediaId).filter(
              (annotation) => annotation.tagIds.includes(tag.id),
            ).length
            const isPendingDelete = pendingDeleteId === tag.id
            return (
              <div
                key={tag.id}
                className="flex flex-wrap items-center gap-4 border border-white/7 bg-surface-dim/60 px-4 py-3"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="min-w-32 flex-1 font-bold">{tag.name}</span>
                <span className="text-xs text-on-secondary">
                  {usageCount} {usageCount === 1 ? 'video' : 'videos'}
                </span>
                <select
                  value={tag.color}
                  onChange={(event) =>
                    updateTagColor(tag.id, event.target.value as TagColor)
                  }
                  className="border border-white/8 bg-surface-container px-3 py-2 text-xs outline-none"
                  aria-label={`Color for ${tag.name}`}
                >
                  {TAG_COLOR_OPTIONS.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (isPendingDelete) {
                      deleteTag(tag.id)
                      setPendingDeleteId(null)
                    } else {
                      setPendingDeleteId(tag.id)
                    }
                  }}
                  onBlur={() => setPendingDeleteId(null)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-bold ${
                    isPendingDelete
                      ? 'bg-red-500/20 text-red-100'
                      : 'text-red-200/70 hover:text-red-100'
                  }`}
                >
                  <Trash2 size={14} />
                  {isPendingDelete ? 'Confirm delete' : 'Delete'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
