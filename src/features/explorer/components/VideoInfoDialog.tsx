import { useEffect, type ReactNode } from 'react'
import { CheckCircle2, Clock3, Eye, FileVideo2, Folder, HardDrive, Tags, X } from 'lucide-react'
import type { MediaAsset } from '../store/mediaStore'
import type { TagDefinition } from '../../annotations/model/annotationTypes'
import type { PlaybackRecord } from '../../playback/model/playbackTypes'
import { formatBytes, formatDuration, getDisplayPath } from '../../../utils/media'

export function VideoInfoDialog({ asset, tags, playback, onClose }: {
  asset: MediaAsset
  tags: readonly TagDefinition[]
  playback: PlaybackRecord | undefined
  onClose: () => void
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown) }
  }, [onClose])

  const progress = playback && playback.durationSeconds > 0 ? Math.round((playback.positionSeconds / playback.durationSeconds) * 100) : 0
  return <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Information for ${asset.name}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto overscroll-contain border border-white/10 bg-surface-container-high shadow-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-white/8 bg-surface-container-high px-6 py-5">
        <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wider text-primary-fixed-dim">Video information</p><h3 className="mt-2 truncate text-xl font-black">{asset.name}</h3></div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center" aria-label="Close video information"><X size={19} /></button>
      </header>
      <div className="grid gap-px bg-white/6 sm:grid-cols-2">
        <InfoCell icon={<Eye size={17} />} label="Completed plays" value={String(playback?.playCount ?? 0)} />
        <InfoCell icon={<CheckCircle2 size={17} />} label="Watch state" value={playback?.watched ? 'Watched' : progress > 0 ? `${progress}% in progress` : 'Unwatched'} />
        <InfoCell icon={<Clock3 size={17} />} label="Last played" value={formatTimestamp(playback?.lastPlayedAt)} />
        <InfoCell icon={<Clock3 size={17} />} label="Last completed" value={formatTimestamp(playback?.completedAt)} />
        <InfoCell icon={<FileVideo2 size={17} />} label="Media" value={`${asset.extension.slice(1).toUpperCase()} · ${formatDuration(asset.duration)}`} />
        <InfoCell icon={<HardDrive size={17} />} label="File size" value={formatBytes(asset.size)} />
        <InfoCell icon={<FileVideo2 size={17} />} label="Dimensions" value={asset.width && asset.height ? `${asset.width} × ${asset.height}` : 'Not available'} />
        <InfoCell icon={<Clock3 size={17} />} label="Modified" value={formatTimestamp(asset.lastModified)} />
      </div>
      <div className="space-y-5 px-6 py-6">
        <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-on-secondary"><Folder size={15} />Library-relative path</div><p className="mt-2 break-all text-sm">{getDisplayPath(asset.pathParts, asset.name)}</p></div>
        <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-on-secondary"><Tags size={15} />Tags ({tags.length})</div><div className="mt-3 flex flex-wrap gap-2">{tags.length ? tags.map((tag) => <span key={tag.id} className="border px-2 py-1 text-xs font-bold" style={{ borderColor: `${tag.color}66`, color: tag.color }}>{tag.name}</span>) : <span className="text-sm text-on-secondary">No tags assigned.</span>}</div></div>
      </div>
    </section>
  </div>
}

function InfoCell({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex gap-3 bg-surface-container px-5 py-4"><span className="mt-0.5 text-primary-fixed-dim">{icon}</span><div><p className="text-[10px] font-black uppercase tracking-wider text-on-secondary">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div></div>
}

function formatTimestamp(timestamp: number | undefined) {
  return timestamp ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp) : 'Never'
}
