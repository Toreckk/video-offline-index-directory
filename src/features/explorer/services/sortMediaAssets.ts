import type { SortOrder } from '../../settings/store/settingsStore'
import type { MediaAsset } from '../store/mediaStore'

type PlaybackSortRecord = { playCount: number; lastPlayedAt: number }

export function sortMediaAssets(
  assets: readonly MediaAsset[],
  sortOrder: SortOrder,
  playbackByMediaId: Readonly<Record<string, PlaybackSortRecord>> = {},
) {
  return [...assets].sort((left, right) => {
    if (sortOrder === 'name') return left.name.localeCompare(right.name)
    if (sortOrder === 'size') return right.size - left.size
    if (sortOrder === 'play-count') {
      const leftPlayback = playbackByMediaId[left.id]
      const rightPlayback = playbackByMediaId[right.id]
      return (rightPlayback?.playCount ?? 0) - (leftPlayback?.playCount ?? 0) || (rightPlayback?.lastPlayedAt ?? 0) - (leftPlayback?.lastPlayedAt ?? 0) || left.name.localeCompare(right.name)
    }
    return right.lastModified - left.lastModified
  })
}
