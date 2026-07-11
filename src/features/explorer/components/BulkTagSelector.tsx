import { useMemo, useState, type RefObject } from 'react'
import { ChevronDown, Tags } from 'lucide-react'
import type { TagDefinition } from '../../annotations/model/annotationTypes'
import type { TagUsageCounts } from '../../annotations/services/tagCatalog'
import { buildTagPickerSections } from '../../annotations/services/tagCatalog'
import { TagPickerList } from '../../annotations/components/TagPickerList'
import { TagSearchInput } from '../../annotations/components/TagSearchInput'
import { PopoverPortal } from '../../../components/controls/PopoverPortal'
import { useDismissiblePopover } from '../../../components/controls/useDismissiblePopover'

export function BulkTagSelector({ tags, favoriteTagIds, usageCounts, onSelect, onToggleFavorite }: {
  tags: TagDefinition[]
  favoriteTagIds: string[]
  usageCounts: TagUsageCounts
  onSelect: (tagId: string) => void
  onToggleFavorite: (tagId: string) => void
}) {
  const [query, setQuery] = useState('')
  const { isOpen, triggerRef, panelRef, toggle, close } = useDismissiblePopover()
  const sections = useMemo(
    () => buildTagPickerSections({ tags, assignedTagIds: [], favoriteTagIds, usageCounts, query }),
    [favoriteTagIds, query, tags, usageCounts],
  )

  return (
    <>
      <button ref={triggerRef as RefObject<HTMLButtonElement>} data-void-popover-trigger type="button" onClick={toggle} className="flex items-center gap-2 border border-white/8 bg-surface-container px-3 py-2 text-xs font-bold text-on-secondary hover:text-white" aria-haspopup="dialog" aria-expanded={isOpen}>
        <Tags size={14} /><span>Add videos to tag...</span><ChevronDown size={13} />
      </button>
      {isOpen && <PopoverPortal anchorRef={triggerRef} panelRef={panelRef} width={320} className="border border-white/10 bg-surface-container-high p-4">
        <h3 className="text-sm font-black">Choose a bulk tag</h3>
        <p className="mt-1 text-xs text-on-secondary">Search or use your favorite and recent tags.</p>
        <div className="mt-4"><TagSearchInput autoFocus value={query} onChange={setQuery} /></div>
        <div className="mt-3 max-h-72 overflow-y-auto pr-1">
          <TagPickerList sections={sections} selectedTagIds={[]} favoriteTagIds={favoriteTagIds} usageCounts={usageCounts} onToggle={(tagId) => { onSelect(tagId); close() }} onToggleFavorite={onToggleFavorite} selectedLabel="" unselectedLabel="Choose" />
        </div>
      </PopoverPortal>}
    </>
  )
}
