import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMediaStore } from '../../media/store/mediaStore'
import { useSettingsStore } from '../../settings/store/settingsStore'
import { ExplorerToolbar } from './ExplorerToolbar'
import { MediaTile } from './MediaTile'
import { useAnnotationStore } from '../../annotations/store/annotationStore'
import { matchesMediaFilters } from '../services/mediaFilters'
import { sortMediaAssets } from '../services/sortMediaAssets'
import { buildTagUsageCounts } from '../../annotations/services/tagCatalog'
import { usePlaybackStore } from '../../playback/store/playbackStore'
import { getDurationBounds } from '../../media/model/durationRange'

const EMPTY_PLAYBACK_RECORDS = {}

const TILE_SIZES = {
  compact: 180,
  comfortable: 240,
  large: 320,
} as const

export function MediaGrid() {
  const assetsById = useMediaStore((state) => state.assetsById)
  const orderedIds = useMediaStore((state) => state.orderedIds)
  const searchQuery = useMediaStore((state) => state.searchQuery)
  const folderFilter = useMediaStore((state) => state.folderFilter)
  const durationFilter = useMediaStore((state) => state.durationFilter)
  const sortOrder = useSettingsStore((state) => state.defaultSortOrder)
  const tileDensity = useSettingsStore((state) => state.tileDensity)
  const annotationsByMediaId = useAnnotationStore(
    (state) => state.annotationsByMediaId,
  )
  const favoritesOnly = useAnnotationStore((state) => state.favoritesOnly)
  const untaggedOnly = useAnnotationStore((state) => state.untaggedOnly)
  const selectedTagIds = useAnnotationStore((state) => state.selectedTagIds)
  const playbackByMediaId = usePlaybackStore((state) => sortOrder === 'play-count' ? state.recordsByMediaId : EMPTY_PLAYBACK_RECORDS)

  const filterCounts = useMemo(() => {
    let favoriteCount = 0
    let untaggedCount = 0
    const tagCounts = buildTagUsageCounts(annotationsByMediaId, orderedIds)
    const folderCounts: Record<string, number> = {}
    for (const id of orderedIds) {
      const asset = assetsById[id]
      if (!asset) continue
      const annotation = annotationsByMediaId[id]
      if (annotation?.favorite) favoriteCount += 1
      if ((annotation?.tagIds.length ?? 0) === 0) untaggedCount += 1
      for (let index = 1; index <= asset.pathParts.length; index += 1) {
        const folder = asset.pathParts.slice(0, index).join('/')
        folderCounts[folder] = (folderCounts[folder] ?? 0) + 1
      }
    }
    return { favoriteCount, untaggedCount, tagCounts, folderCounts }
  }, [annotationsByMediaId, assetsById, orderedIds])

  const availableFolders = useMemo(
    () =>
      Array.from(
        new Set(
          orderedIds.flatMap((id) => {
            const folder = assetsById[id]?.pathParts.join('/')
            return folder ? [folder] : []
          }),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [assetsById, orderedIds],
  )
  const durationBounds = useMemo(
    () => getDurationBounds(orderedIds.map((id) => assetsById[id]?.duration)),
    [assetsById, orderedIds],
  )

  const visibleAssets = useMemo(() => {
    const assets = orderedIds.flatMap((id) => {
      const asset = assetsById[id]
      if (!asset) return []
      const annotation = annotationsByMediaId[asset.id]
      return matchesMediaFilters(asset, annotation, {
        searchQuery,
        folderFilter,
        durationFilter,
        favoritesOnly,
        untaggedOnly,
        selectedTagIds,
      })
        ? [asset]
        : []
    })

    return sortMediaAssets(assets, sortOrder, playbackByMediaId)
  }, [
    annotationsByMediaId,
    assetsById,
    favoritesOnly,
    untaggedOnly,
    folderFilter,
    durationFilter,
    orderedIds,
    playbackByMediaId,
    searchQuery,
    selectedTagIds,
    sortOrder,
  ])

  const queueIds = useMemo(() => visibleAssets.map((asset) => asset.id), [visibleAssets])
  return (
    <div className="min-h-full w-full bg-surface-dim">
      <ExplorerToolbar
        visibleCount={visibleAssets.length}
        totalCount={orderedIds.length}
        availableFolders={availableFolders}
        favoriteCount={filterCounts.favoriteCount}
        untaggedCount={filterCounts.untaggedCount}
        durationBounds={durationBounds}
        tagCounts={filterCounts.tagCounts}
        folderCounts={filterCounts.folderCounts}
      />
      {visibleAssets.length === 0 ? (
        <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-on-secondary">
          No videos match the current search and filters.
        </div>
      ) : (
        <VirtualizedMediaTiles
          assets={visibleAssets}
          queueIds={queueIds}
          minimumTileWidth={TILE_SIZES[tileDensity]}
        />
      )}
    </div>
  )
}

function VirtualizedMediaTiles({
  assets,
  queueIds,
  minimumTileWidth,
}: {
  assets: ReturnType<typeof sortMediaAssets>
  queueIds: string[]
  minimumTileWidth: number
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [metrics, setMetrics] = useState({ width: 1024, scrollMargin: 0 })

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const updateMetrics = () => setMetrics({
      width: Math.max(1, grid.clientWidth),
      scrollMargin: grid.offsetTop,
    })
    updateMetrics()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateMetrics)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [])

  const gap = 1
  const columns = Math.max(
    1,
    Math.floor((metrics.width + gap) / (minimumTileWidth + gap)),
  )
  const tileWidth = (metrics.width - gap * (columns - 1)) / columns
  const tileHeight = tileWidth * 9 / 16
  // TanStack Virtual owns mutable measurement functions; React Compiler must
  // leave this component un-memoized so scrolling measurements stay current.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: assets.length,
    getScrollElement: () => document.getElementById('void-main-scroll'),
    estimateSize: () => tileHeight,
    gap,
    lanes: columns,
    overscan: columns * 3,
    scrollMargin: metrics.scrollMargin,
    initialRect: { width: metrics.width, height: 900 },
  })

  useLayoutEffect(() => virtualizer.measure(), [columns, metrics.scrollMargin, tileHeight, virtualizer])

  const measuredItems = virtualizer.getVirtualItems()
  const virtualItems = measuredItems.length > 0
    ? measuredItems
    : Array.from(
      { length: Math.min(assets.length, columns * 6) },
      (_, index) => ({
        index,
        lane: index % columns,
        start: metrics.scrollMargin + Math.floor(index / columns) * (tileHeight + gap),
      }),
    )
  const estimatedTotalHeight = Math.ceil(assets.length / columns) * (tileHeight + gap) - gap

  return (
    <div
      ref={gridRef}
      className="relative w-full bg-surface-dim"
      style={{ height: Math.max(virtualizer.getTotalSize(), estimatedTotalHeight) } as CSSProperties}
      role="list"
      aria-label="Videos"
    >
      {virtualItems.map((virtualItem) => {
        const asset = assets[virtualItem.index]
        if (!asset) return null
        return (
          <div
            key={asset.id}
            className="virtual-media-tile absolute left-0 top-0"
            style={{
              width: tileWidth,
              height: tileHeight,
              transform: `translate(${virtualItem.lane * (tileWidth + gap)}px, ${virtualItem.start - metrics.scrollMargin}px)`,
            }}
            role="listitem"
            aria-posinset={virtualItem.index + 1}
            aria-setsize={assets.length}
          >
            <MediaTile
              asset={asset}
              priorityIndex={virtualItem.index}
              queueIds={queueIds}
            />
          </div>
        )
      })}
    </div>
  )
}
