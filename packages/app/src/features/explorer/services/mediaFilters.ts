import type { MediaAnnotation } from '../../annotations/model/annotationTypes'
import type { MediaAsset } from '../../media/store/mediaStore'
import { matchesDurationRange, type DurationRange } from '../../media/model/durationRange'

export type MediaFilters = {
  searchQuery: string
  folderFilter: string | null
  durationFilter: DurationRange | null
  favoritesOnly: boolean
  untaggedOnly: boolean
  selectedTagIds: readonly string[]
}

export function matchesMediaFilters(
  asset: MediaAsset,
  annotation: MediaAnnotation | undefined,
  filters: MediaFilters,
) {
  const normalizedQuery = filters.searchQuery.trim().toLocaleLowerCase()
  const searchablePath = [...asset.pathParts, asset.name]
    .join('/')
    .toLocaleLowerCase()
  const assetFolder = asset.pathParts.join('/')
  const matchesSearch =
    !normalizedQuery || searchablePath.includes(normalizedQuery)
  const matchesFolder =
    !filters.folderFilter ||
    assetFolder === filters.folderFilter ||
    assetFolder.startsWith(`${filters.folderFilter}/`)
  const matchesFavorite =
    !filters.favoritesOnly || annotation?.favorite === true
  const matchesTags = filters.selectedTagIds.every((tagId) =>
    annotation?.tagIds.includes(tagId),
  )
  const matchesUntagged =
    !filters.untaggedOnly || (annotation?.tagIds.length ?? 0) === 0
  const matchesDuration =
    !filters.durationFilter || matchesDurationRange(asset.duration, filters.durationFilter)

  return matchesSearch && matchesFolder && matchesFavorite && matchesTags && matchesUntagged && matchesDuration
}
