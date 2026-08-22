import { useState, type FormEvent } from 'react'
import { Check, Pencil, Star, Trash2, X } from 'lucide-react'
import { MAX_TAG_NAME_LENGTH, type TagColor, type TagDefinition } from '../model/annotationTypes'
import { TagColorSelect } from './TagColorSelect'

export function ManagedTagRow({ tag, usageCount, isFavorite, onRename, onColorChange, onToggleFavorite, onDelete }: {
  tag: TagDefinition
  usageCount: number
  isFavorite: boolean
  onRename: (name: string) => void
  onColorChange: (color: TagColor) => void
  onToggleFavorite: () => void
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(tag.name)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = (event: FormEvent) => {
    event.preventDefault()
    try {
      onRename(name)
      setIsEditing(false)
      setError(null)
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Could not rename tag.')
    }
  }

  const cancelEdit = () => {
    setName(tag.name)
    setError(null)
    setIsEditing(false)
  }

  return (
    <div className="grid items-center gap-3 border border-white/7 bg-surface-dim/60 px-4 py-3 md:grid-cols-[minmax(220px,1fr)_90px_44px_150px_160px]">
      <div className="min-w-0">
        {isEditing ? (
          <form onSubmit={save} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
            <input autoFocus value={name} onChange={(event) => { setName(event.target.value); setError(null) }} maxLength={MAX_TAG_NAME_LENGTH} className="h-9 min-w-0 flex-1 border border-primary/40 bg-surface-container px-3 text-sm font-bold outline-none" aria-label={`Rename ${tag.name}`} />
            <button type="submit" disabled={!name.trim()} className="text-emerald-300 disabled:opacity-40" aria-label={`Save name for ${tag.name}`}><Check size={17} /></button>
            <button type="button" onClick={cancelEdit} className="text-on-secondary hover:text-white" aria-label={`Cancel renaming ${tag.name}`}><X size={17} /></button>
          </form>
        ) : (
          <button type="button" onClick={() => setIsEditing(true)} className="group/name flex max-w-full items-center gap-3 text-left" aria-label={`Rename ${tag.name}`}>
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
            <span className="truncate font-bold">{tag.name}</span>
            <Pencil size={13} className="shrink-0 text-on-secondary/30 group-hover/name:text-primary-fixed-dim" />
          </button>
        )}
        {error && <p className="mt-2 text-xs text-red-200" role="alert">{error}</p>}
      </div>

      <span className="text-xs tabular-nums text-on-secondary">{usageCount} {usageCount === 1 ? 'video' : 'videos'}</span>

      <button type="button" onClick={onToggleFavorite} className={`flex h-9 w-9 items-center justify-center ${isFavorite ? 'text-amber-300' : 'text-on-secondary/40 hover:text-amber-200'}`} aria-label={isFavorite ? `Remove ${tag.name} from favorite tags` : `Add ${tag.name} to favorite tags`} aria-pressed={isFavorite}>
        <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>

      <TagColorSelect value={tag.color} onChange={(color) => color !== 'auto' && onColorChange(color)} className="w-full border border-white/8 bg-surface-container px-3 py-2 text-xs" ariaLabel={`Color for ${tag.name}`} />

      <button type="button" onClick={() => { if (confirmDelete) onDelete(); else setConfirmDelete(true) }} onBlur={() => setConfirmDelete(false)} className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold ${confirmDelete ? 'bg-red-500/20 text-red-100' : 'text-red-200/70 hover:text-red-100'}`}>
        <Trash2 size={14} />{confirmDelete ? 'Confirm delete' : 'Delete'}
      </button>
    </div>
  )
}
