import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { MediaAsset } from '../../media/store/mediaStore'
import { MediaTile } from './MediaTile'

export function VirtualizedMediaTiles({
  assets,
  queueIds,
  minimumTileWidth,
  layoutKey,
}: {
  assets: MediaAsset[]
  queueIds: string[]
  minimumTileWidth: number
  layoutKey?: string | number | boolean
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [metrics, setMetrics] = useState({ width: 1024, scrollMargin: 0 })

  const updateMetrics = useCallback(() => {
    const grid = gridRef.current
    if (!grid) return
    const scrollElement = document.getElementById('void-main-scroll')
    const nextMetrics = {
      width: Math.max(1, grid.clientWidth),
      scrollMargin: grid.getBoundingClientRect().top + (scrollElement?.scrollTop ?? 0),
    }
    setMetrics((current) => current.width === nextMetrics.width && current.scrollMargin === nextMetrics.scrollMargin
      ? current
      : nextMetrics)
  }, [])

  useLayoutEffect(() => updateMetrics(), [layoutKey, updateMetrics])

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid || typeof ResizeObserver === 'undefined') return
    updateMetrics()
    const observer = new ResizeObserver(updateMetrics)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [updateMetrics])

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
