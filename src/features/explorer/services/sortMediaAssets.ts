import type { SortOrder } from '../../settings/store/settingsStore'
import type { MediaAsset } from '../store/mediaStore'

export function sortMediaAssets(
  assets: readonly MediaAsset[],
  sortOrder: SortOrder,
) {
  return [...assets].sort((left, right) => {
    if (sortOrder === 'name') return left.name.localeCompare(right.name)
    if (sortOrder === 'size') return right.size - left.size
    return right.lastModified - left.lastModified
  })
}
