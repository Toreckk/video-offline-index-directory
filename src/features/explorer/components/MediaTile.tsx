import { useEffect, useRef } from 'react'
import { Film, Heart, Play, TriangleAlert } from 'lucide-react'
import type { MediaAsset } from '../store/mediaStore'
import { useThumbnailUrl } from '../hooks/useThumbnailUrl'
import { useHoverPreview } from '../hooks/useHoverPreview'
import { thumbnailQueue } from '../services/thumbnailQueue'
import { formatBytes, formatDuration } from '../../../utils/media'
import { useSettingsStore } from '../../settings/store/settingsStore'
import { useAnnotationStore } from '../../annotations/store/annotationStore'
import { MediaTagMenu } from '../../annotations/components/MediaTagMenu'

type MediaTileProps = {
  asset: MediaAsset
  priorityIndex: number
  onOpen: () => void
}

export function MediaTile({ asset, priorityIndex, onOpen }: MediaTileProps) {
  const tileRef = useRef<HTMLDivElement>(null)
  const thumbnailUrl = useThumbnailUrl(
    asset.thumbnailBlobKey,
    asset.thumbnailStatus,
  )
  const showFilenames = useSettingsStore((state) => state.showFilenames)
  const thumbnailPriority = useSettingsStore((state) => state.thumbnailPriority)
  const annotation = useAnnotationStore(
    (state) => state.annotationsByMediaId[asset.id],
  )
  const tagsById = useAnnotationStore((state) => state.tagsById)
  const toggleFavorite = useAnnotationStore((state) => state.toggleFavorite)
  const bulkTagId = useAnnotationStore((state) => state.bulkTagId)
  const bulkSelectedMediaIds = useAnnotationStore((state) => state.bulkSelectedMediaIds)
  const toggleBulkMedia = useAnnotationStore((state) => state.toggleBulkMedia)
  const { objectUrl, videoRef, isPreviewing, previewHandlers } =
    useHoverPreview(asset)
  const isFavorite = annotation?.favorite ?? false
  const isBulkSelected = bulkSelectedMediaIds.includes(asset.id)
  const bulkTag = bulkTagId ? tagsById[bulkTagId] : undefined
  const allTags = (annotation?.tagIds ?? [])
    .flatMap((tagId) => {
      const tag = tagsById[tagId]
      return tag ? [tag] : []
    })
  const visibleTags = allTags.slice(0, 3)
  const hiddenTagCount = Math.max(0, allTags.length - visibleTags.length)

  useEffect(() => {
    if (
      thumbnailPriority !== 'visible-first' ||
      asset.thumbnailStatus === 'ready'
    ) {
      return
    }

    const element = tileRef.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      thumbnailQueue.prioritize(asset.id, priorityIndex)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          thumbnailQueue.prioritize(asset.id, priorityIndex)
        } else {
          thumbnailQueue.deprioritize(asset.id)
        }
      },
      { rootMargin: '500px 0px', threshold: 0.01 },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      thumbnailQueue.deprioritize(asset.id)
    }
  }, [asset.id, asset.thumbnailStatus, priorityIndex, thumbnailPriority])

  return (
    <div
      ref={tileRef}
      {...previewHandlers}
      className={`group relative aspect-video min-w-0 bg-surface-container ${isBulkSelected ? 'z-10 ring-2 ring-inset' : ''}`}
      style={isBulkSelected ? { outlineColor: bulkTag?.color, boxShadow: `inset 0 0 0 3px ${bulkTag?.color ?? '#A78BFA'}` } : undefined}
    >
      <button
        type="button"
        onClick={bulkTagId ? () => toggleBulkMedia(asset.id) : onOpen}
        className="absolute inset-0 h-full w-full overflow-hidden text-left outline-none ring-inset transition focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={bulkTagId ? `${isBulkSelected ? 'Deselect' : 'Select'} ${asset.name}` : `Play ${asset.name}`}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-surface-container-high to-surface-dim">
            {asset.thumbnailStatus === 'error' ? (
              <TriangleAlert size={28} className="text-amber-200/60" />
            ) : (
              <Film size={34} className="animate-pulse text-primary-fixed-dim/45" />
            )}
          </span>
        )}

        {objectUrl && (
          <video
            ref={videoRef}
            src={objectUrl}
            muted
            playsInline
            preload="metadata"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
              isPreviewing ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        <span className="absolute inset-0 bg-linear-to-t from-black/85 via-transparent to-black/10 opacity-70 transition group-hover:opacity-90" />
        <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Play size={17} fill="currentColor" />
        </span>
        <span className="absolute right-2 top-2 bg-black/65 px-2 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
          {asset.extension.slice(1)}
        </span>

        <span className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 p-3">
          {showFilenames && <span className="block truncate text-sm font-black leading-tight">{asset.name}</span>}
          <span className="flex min-w-0 items-center justify-between gap-3">
          <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {visibleTags.map((tag) => <span key={tag.id} className="min-w-0 truncate border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider" style={{ borderColor: `${tag.color}66`, backgroundColor: `${tag.color}22`, color: tag.color }}>{tag.name}</span>)}
            {hiddenTagCount > 0 && <span className="shrink-0 border border-white/15 bg-black/35 px-1.5 py-0.5 text-[8px] font-black text-white/75">+{hiddenTagCount}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-[9px] font-bold tabular-nums text-white/70">
            <span>{formatBytes(asset.size)}</span><span aria-hidden="true">/</span><span>{formatDuration(asset.duration)}</span>
          </span>
          </span>
        </span>
      </button>

      {bulkTagId ? (
        <span className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2 bg-black/75 px-3 py-2 text-xs font-black backdrop-blur">
          <input type="checkbox" checked={isBulkSelected} readOnly className="h-4 w-4 accent-primary" tabIndex={-1} />
          {isBulkSelected ? 'Selected' : 'Select'}
        </span>
      ) : <>
      <button
        type="button"
        onClick={() => toggleFavorite(asset.id)}
        className={`absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition ${
          isFavorite
            ? 'border-rose-300/50 bg-rose-500/25 text-rose-200'
            : 'border-white/10 bg-black/55 text-white/65 opacity-0 hover:text-rose-200 group-hover:opacity-100 focus-visible:opacity-100'
        }`}
        aria-label={isFavorite ? `Remove ${asset.name} from favorites` : `Add ${asset.name} to favorites`}
        aria-pressed={isFavorite}
      >
        <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
      <div className="absolute left-14 top-3 z-20 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <MediaTagMenu mediaId={asset.id} align="left" compact />
      </div>
      </>}
    </div>
  )
}
