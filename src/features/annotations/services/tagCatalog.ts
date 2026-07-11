import type { MediaAnnotation, TagDefinition } from '../model/annotationTypes'

export type TagUsageCounts = Record<string, number>
export type TagManagementSort = 'name' | 'usage' | 'recent'

export type TagPickerSection = {
  id: 'assigned' | 'favorites' | 'recent' | 'all' | 'search'
  label: string
  tags: TagDefinition[]
}

export function selectTags(
  tagsById: Record<string, TagDefinition>,
  orderedTagIds: readonly string[],
) {
  return orderedTagIds.flatMap((tagId) => {
    const tag = tagsById[tagId]
    return tag ? [tag] : []
  })
}

export function buildTagUsageCounts(
  annotationsByMediaId: Record<string, MediaAnnotation>,
): TagUsageCounts {
  const counts: TagUsageCounts = {}
  for (const annotation of Object.values(annotationsByMediaId)) {
    for (const tagId of annotation.tagIds) counts[tagId] = (counts[tagId] ?? 0) + 1
  }
  return counts
}

export function filterTags(tags: readonly TagDefinition[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return [...tags]
  return tags.filter((tag) => tag.name.toLocaleLowerCase().includes(normalizedQuery))
}

export function sortTagsForDiscovery(
  tags: readonly TagDefinition[],
  usageCounts: TagUsageCounts,
) {
  return [...tags].sort((left, right) => {
    const usageDifference = (usageCounts[right.id] ?? 0) - (usageCounts[left.id] ?? 0)
    if (usageDifference !== 0) return usageDifference
    const recentDifference = (right.lastUsedAt ?? 0) - (left.lastUsedAt ?? 0)
    return recentDifference || left.name.localeCompare(right.name)
  })
}

export function sortTagsForManagement(
  tags: readonly TagDefinition[],
  usageCounts: TagUsageCounts,
  sort: TagManagementSort,
) {
  if (sort === 'name') return [...tags].sort(byName)
  if (sort === 'recent') {
    return [...tags].sort(
      (left, right) =>
        (right.lastUsedAt ?? 0) - (left.lastUsedAt ?? 0) || byName(left, right),
    )
  }
  return sortTagsForDiscovery(tags, usageCounts)
}

export function buildTagPickerSections({
  tags,
  assignedTagIds,
  favoriteTagIds,
  usageCounts,
  query,
  recentLimit = 8,
}: {
  tags: readonly TagDefinition[]
  assignedTagIds: readonly string[]
  favoriteTagIds: readonly string[]
  usageCounts: TagUsageCounts
  query: string
  recentLimit?: number
}): TagPickerSection[] {
  const filtered = filterTags(tags, query)
  if (query.trim()) {
    return [{ id: 'search', label: 'Search results', tags: sortTagsForDiscovery(filtered, usageCounts) }]
  }

  const assigned = new Set(assignedTagIds)
  const favorites = new Set(favoriteTagIds)
  const claimed = new Set<string>()
  const take = (predicate: (tag: TagDefinition) => boolean) =>
    tags.filter((tag) => !claimed.has(tag.id) && predicate(tag)).map((tag) => {
      claimed.add(tag.id)
      return tag
    })

  const assignedTags = take((tag) => assigned.has(tag.id)).sort(byName)
  const favoriteTags = take((tag) => favorites.has(tag.id)).sort(byName)
  const recentTags = tags
    .filter((tag) => !claimed.has(tag.id) && Boolean(tag.lastUsedAt))
    .sort((left, right) => (right.lastUsedAt ?? 0) - (left.lastUsedAt ?? 0))
    .slice(0, recentLimit)
  for (const tag of recentTags) claimed.add(tag.id)
  const remainingTags = sortTagsForDiscovery(
    tags.filter((tag) => !claimed.has(tag.id)),
    usageCounts,
  )

  return [
    { id: 'assigned', label: 'Assigned', tags: assignedTags },
    { id: 'favorites', label: 'Favorite tags', tags: favoriteTags },
    { id: 'recent', label: 'Recently used', tags: recentTags },
    { id: 'all', label: 'All tags', tags: remainingTags },
  ].filter((section) => section.tags.length > 0) as TagPickerSection[]
}

function byName(left: TagDefinition, right: TagDefinition) {
  return left.name.localeCompare(right.name)
}
