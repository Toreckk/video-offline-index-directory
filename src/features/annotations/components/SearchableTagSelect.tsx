import { useMemo, useState, type RefObject } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { PopoverPortal } from '../../../components/controls/PopoverPortal'
import { useDismissiblePopover } from '../../../components/controls/useDismissiblePopover'
import type { TagDefinition } from '../model/annotationTypes'
import { filterTags } from '../services/tagCatalog'
import { TagSearchInput } from './TagSearchInput'

export function SearchableTagSelect({ label, tags, value, onChange, excludeTagId, placeholder = 'Choose a tag' }: {
  label: string
  tags: readonly TagDefinition[]
  value: string | null
  onChange: (tagId: string) => void
  excludeTagId?: string | null
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const { isOpen, triggerRef, panelRef, toggle, close } = useDismissiblePopover()
  const selected = tags.find((tag) => tag.id === value)
  const matches = useMemo(() => filterTags(tags.filter((tag) => tag.id !== excludeTagId), query).sort((a, b) => a.name.localeCompare(b.name)), [excludeTagId, query, tags])
  return <div>
    <span className="mb-2 block text-xs font-bold text-on-secondary">{label}</span>
    <button ref={triggerRef as RefObject<HTMLButtonElement>} data-void-popover-trigger type="button" onClick={toggle} className="flex h-11 w-full items-center gap-3 border border-white/10 bg-surface-dim px-3 text-left text-sm" aria-expanded={isOpen}>
      {selected && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selected.color }} />}
      <span className="min-w-0 flex-1 truncate">{selected?.name ?? placeholder}</span><ChevronDown size={15} />
    </button>
    {isOpen && <PopoverPortal anchorRef={triggerRef} panelRef={panelRef} width={300} className="border border-white/10 bg-surface-container-high p-3">
      <TagSearchInput autoFocus value={query} onChange={setQuery} />
      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
        {matches.map((tag) => <button key={tag.id} type="button" onClick={() => { onChange(tag.id); setQuery(''); close() }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-white/6">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} /><span className="min-w-0 flex-1 truncate">{tag.name}</span>{tag.id === value && <Check size={14} className="text-primary-fixed-dim" />}
        </button>)}
        {matches.length === 0 && <p className="py-4 text-center text-xs text-on-secondary">No matching tags.</p>}
      </div>
    </PopoverPortal>}
  </div>
}
