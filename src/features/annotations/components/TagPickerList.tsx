import { useState } from 'react'
import { ChevronDown, Star } from 'lucide-react'
import type { TagPickerSection, TagUsageCounts } from '../services/tagCatalog'

const INITIAL_TAG_LIMIT = 60

export function TagPickerList({ sections, selectedTagIds, favoriteTagIds, usageCounts, onToggle, onToggleFavorite, selectedLabel = 'Added', unselectedLabel = 'Add', initiallyCollapsedSectionIds = [] }: {
  sections: TagPickerSection[]
  selectedTagIds: readonly string[]
  favoriteTagIds: readonly string[]
  usageCounts: TagUsageCounts
  onToggle: (tagId: string) => void
  onToggleFavorite: (tagId: string) => void
  selectedLabel?: string
  unselectedLabel?: string
  initiallyCollapsedSectionIds?: TagPickerSection['id'][]
}) {
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [collapsedSections, setCollapsedSections] = useState<string[]>(initiallyCollapsedSectionIds)
  const selected = new Set(selectedTagIds)
  const favorites = new Set(favoriteTagIds)

  if (sections.length === 0) {
    return <p className="py-5 text-center text-xs text-on-secondary">No tags match that search.</p>
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const isCollapsible = initiallyCollapsedSectionIds.includes(section.id)
        const collapsed = collapsedSections.includes(section.id)
        const expanded = expandedSections.includes(section.id)
        const visibleTags = expanded ? section.tags : section.tags.slice(0, INITIAL_TAG_LIMIT)
        const remaining = section.tags.length - visibleTags.length
        return (
          <section key={section.id}>
            {isCollapsible ? <button type="button" onClick={() => setCollapsedSections((current) => collapsed ? current.filter((id) => id !== section.id) : [...current, section.id])} className="mb-1.5 flex w-full items-center justify-between px-1 py-1 text-[10px] font-black uppercase tracking-wider text-on-secondary hover:text-white" aria-expanded={!collapsed} aria-label={`${section.label} (${section.tags.length}) ${collapsed ? 'Show' : 'Hide'}`}>
              <span>{section.label} ({section.tags.length})</span><span className="flex items-center gap-1">{collapsed ? 'Show' : 'Hide'}<ChevronDown size={12} className={`transition ${collapsed ? '' : 'rotate-180'}`} /></span>
            </button> : <div className="mb-1.5 flex items-center justify-between px-1 text-[10px] font-black uppercase tracking-wider text-on-secondary"><span>{section.label}</span><span>{section.tags.length}</span></div>}
            {!collapsed && <div className="space-y-1">
              {visibleTags.map((tag) => {
                const isSelected = selected.has(tag.id)
                const isFavorite = favorites.has(tag.id)
                return (
                  <div key={tag.id} className="flex items-stretch border" style={{ borderColor: isSelected ? tag.color : `${tag.color}33`, backgroundColor: isSelected ? `${tag.color}1f` : 'transparent' }}>
                    <button type="button" onClick={() => onToggle(tag.id)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left text-sm" aria-pressed={isSelected}>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                      <span className="text-[10px] tabular-nums text-on-secondary">{usageCounts[tag.id] ?? 0}</span>
                      <span className="w-10 text-right text-[10px] font-bold text-on-secondary">{isSelected ? selectedLabel : unselectedLabel}</span>
                    </button>
                    <button type="button" onClick={() => onToggleFavorite(tag.id)} className={`flex w-9 shrink-0 items-center justify-center border-l border-white/7 ${isFavorite ? 'text-amber-300' : 'text-on-secondary/40 hover:text-amber-200'}`} aria-label={isFavorite ? `Remove ${tag.name} from favorite tags` : `Add ${tag.name} to favorite tags`} aria-pressed={isFavorite}>
                      <Star size={13} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                )
              })}
            </div>}
            {!collapsed && remaining > 0 && <button type="button" onClick={() => setExpandedSections((current) => [...current, section.id])} className="mt-2 w-full border border-dashed border-white/10 py-2 text-xs font-bold text-on-secondary hover:text-white">Show {remaining} more</button>}
          </section>
        )
      })}
    </div>
  )
}
