import { useMemo, useState, type RefObject } from 'react'
import { Folder, Heart, Search, SlidersHorizontal, Tag, Tags, X } from 'lucide-react'
import { useMediaStore } from '../store/mediaStore'
import { useSettingsStore, type SortOrder, type TileDensity } from '../../settings/store/settingsStore'
import { useAnnotationStore } from '../../annotations/store/annotationStore'
import { ThemedSelect } from '../../../components/controls/ThemedSelect'
import { PopoverPortal } from '../../../components/controls/PopoverPortal'
import { useDismissiblePopover } from '../../../components/controls/useDismissiblePopover'
import { buildTagPickerSections, selectTags } from '../../annotations/services/tagCatalog'
import { TagSearchInput } from '../../annotations/components/TagSearchInput'
import { TagPickerList } from '../../annotations/components/TagPickerList'
import { BulkTagSelector } from './BulkTagSelector'

type ExplorerToolbarProps = {
  visibleCount: number
  totalCount: number
  availableFolders: string[]
  favoriteCount: number
  untaggedCount: number
  tagCounts: Record<string, number>
  folderCounts: Record<string, number>
}

export function ExplorerToolbar({ visibleCount, totalCount, availableFolders, favoriteCount, untaggedCount, tagCounts, folderCounts }: ExplorerToolbarProps) {
  const [tagSearch, setTagSearch] = useState('')
  const { isOpen: isTagFilterOpen, triggerRef: tagFilterTriggerRef, panelRef: tagFilterPanelRef, toggle: toggleTagFilterMenu } = useDismissiblePopover()
  const searchQuery = useMediaStore((state) => state.searchQuery)
  const folderFilter = useMediaStore((state) => state.folderFilter)
  const setSearchQuery = useMediaStore((state) => state.setSearchQuery)
  const setFolderFilter = useMediaStore((state) => state.setFolderFilter)
  const sortOrder = useSettingsStore((state) => state.defaultSortOrder)
  const tileDensity = useSettingsStore((state) => state.tileDensity)
  const updateSetting = useSettingsStore((state) => state.updateSetting)
  const tagsById = useAnnotationStore((state) => state.tagsById)
  const orderedTagIds = useAnnotationStore((state) => state.orderedTagIds)
  const selectedTagIds = useAnnotationStore((state) => state.selectedTagIds)
  const favoriteTagIds = useAnnotationStore((state) => state.favoriteTagIds)
  const favoritesOnly = useAnnotationStore((state) => state.favoritesOnly)
  const untaggedOnly = useAnnotationStore((state) => state.untaggedOnly)
  const bulkTagId = useAnnotationStore((state) => state.bulkTagId)
  const bulkSelectedMediaIds = useAnnotationStore((state) => state.bulkSelectedMediaIds)
  const toggleTagFilter = useAnnotationStore((state) => state.toggleTagFilter)
  const toggleTagFavorite = useAnnotationStore((state) => state.toggleTagFavorite)
  const setFavoritesOnly = useAnnotationStore((state) => state.setFavoritesOnly)
  const setUntaggedOnly = useAnnotationStore((state) => state.setUntaggedOnly)
  const clearAnnotationFilters = useAnnotationStore((state) => state.clearFilters)
  const startBulkTagging = useAnnotationStore((state) => state.startBulkTagging)
  const cancelBulkTagging = useAnnotationStore((state) => state.cancelBulkTagging)
  const applyBulkTagging = useAnnotationStore((state) => state.applyBulkTagging)
  const tags = useMemo(
    () => selectTags(tagsById, orderedTagIds),
    [orderedTagIds, tagsById],
  )
  const tagSections = useMemo(
    () => buildTagPickerSections({ tags, assignedTagIds: selectedTagIds, favoriteTagIds, usageCounts: tagCounts, query: tagSearch, order: 'usage', grouped: false, assignedLabel: 'Selected tags', pinAssignedDuringSearch: true }),
    [favoriteTagIds, selectedTagIds, tagCounts, tagSearch, tags],
  )
  const bulkTag = bulkTagId ? tagsById[bulkTagId] : undefined
  const hasFilters = favoritesOnly || untaggedOnly || selectedTagIds.length > 0 || folderFilter !== null

  return (
    <header className="sticky top-0 z-[80] border-b border-white/6 bg-surface-dim/98 px-8 py-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex h-11 min-w-[240px] flex-1 items-center gap-3 border border-white/8 bg-surface-container px-4 focus-within:border-primary/50">
          <Search size={18} className="text-on-secondary" />
          <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search filenames or paths" className="w-full bg-transparent text-sm outline-none placeholder:text-on-secondary/50" />
        </label>
        <span className="text-xs font-bold uppercase tracking-wider text-on-secondary">{visibleCount} of {totalCount}</span>
        <ThemedSelect ariaLabel="Sort order" value={sortOrder} onChange={(value) => updateSetting('defaultSortOrder', value as SortOrder)} icon={<SlidersHorizontal size={16} />} className="w-48" options={[{ value: 'modified-date', label: 'Recently modified' }, { value: 'name', label: 'Filename' }, { value: 'size', label: 'File size' }, { value: 'play-count', label: 'Most watched' }]} />
        <ThemedSelect ariaLabel="Tile density" value={tileDensity} onChange={(value) => updateSetting('tileDensity', value as TileDensity)} className="w-36" options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'large', label: 'Large' }]} />
      </div>

      {bulkTag ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 border p-3" style={{ borderColor: `${bulkTag.color}66`, backgroundColor: `${bulkTag.color}12` }}>
          <Tags size={17} style={{ color: bulkTag.color }} />
          <span className="text-sm font-black">Add videos to {bulkTag.name}</span>
          <span className="text-xs text-on-secondary">Select tiles, then apply. Existing assignments are left unchanged.</span>
          <span className="ml-auto text-xs font-bold">{bulkSelectedMediaIds.length} selected</span>
          <button type="button" onClick={cancelBulkTagging} className="border border-white/10 px-3 py-2 text-xs font-bold">Cancel</button>
          <button type="button" onClick={() => applyBulkTagging()} disabled={bulkSelectedMediaIds.length === 0} className="bg-primary px-4 py-2 text-xs font-black disabled:opacity-40">Add selected</button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setFavoritesOnly(!favoritesOnly)} className={`flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase tracking-wider ${favoritesOnly ? 'border-rose-300/40 bg-rose-500/15 text-rose-200' : 'border-white/8 bg-surface-container text-on-secondary hover:text-white'}`} aria-pressed={favoritesOnly}>
            <Heart size={14} fill={favoritesOnly ? 'currentColor' : 'none'} /> Favorites ({favoriteCount})
          </button>
          <button type="button" onClick={() => setUntaggedOnly(!untaggedOnly)} className={`flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase tracking-wider ${untaggedOnly ? 'border-primary/50 bg-primary/15 text-primary-fixed-dim' : 'border-white/8 bg-surface-container text-on-secondary hover:text-white'}`} aria-pressed={untaggedOnly}>
            <Tag size={14} /> Untagged ({untaggedCount})
          </button>
          {availableFolders.length > 0 && (
            <ThemedSelect ariaLabel="Folder filter" value={folderFilter ?? ''} onChange={(value) => setFolderFilter(value || null)} icon={<Folder size={14} />} className="w-60" options={[{ value: '', label: 'All folders', detail: String(totalCount) }, ...availableFolders.map((folder) => ({ value: folder, label: folder, detail: String(folderCounts[folder] ?? 0) }))]} />
          )}

          <div>
            <button ref={tagFilterTriggerRef as RefObject<HTMLButtonElement>} data-void-popover-trigger type="button" onClick={toggleTagFilterMenu} disabled={tags.length === 0} className="flex items-center gap-2 border border-white/8 bg-surface-container px-3 py-2 text-xs font-black uppercase tracking-wider text-on-secondary hover:text-white disabled:opacity-40" aria-expanded={isTagFilterOpen}>
              <Tags size={14} /> Tags {selectedTagIds.length > 0 ? `(${selectedTagIds.length})` : ''}
            </button>
            {isTagFilterOpen && (
              <PopoverPortal anchorRef={tagFilterTriggerRef} panelRef={tagFilterPanelRef} width={320} className="border border-white/10 bg-surface-container-high p-4">
                <TagSearchInput autoFocus value={tagSearch} onChange={setTagSearch} />
                <p className="mt-3 text-[10px] uppercase tracking-wider text-on-secondary">Multiple selections must all match</p>
                <div className="mt-3 max-h-72 overflow-y-auto pr-1">
                  <TagPickerList sections={tagSections} selectedTagIds={selectedTagIds} favoriteTagIds={favoriteTagIds} usageCounts={tagCounts} onToggle={toggleTagFilter} onToggleFavorite={toggleTagFavorite} selectedLabel="On" unselectedLabel="Off" />
                </div>
              </PopoverPortal>
            )}
          </div>

          {tags.length > 0 && <BulkTagSelector tags={tags} favoriteTagIds={favoriteTagIds} usageCounts={tagCounts} onSelect={startBulkTagging} onToggleFavorite={toggleTagFavorite} />}

          {hasFilters && <button type="button" onClick={() => { clearAnnotationFilters(); setFolderFilter(null) }} className="ml-auto flex items-center gap-1.5 px-2 py-2 text-xs font-bold text-on-secondary hover:text-white"><X size={14} /> Clear filters</button>}
        </div>
      )}
    </header>
  )
}
