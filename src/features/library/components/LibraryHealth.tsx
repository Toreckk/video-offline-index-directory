import { useState } from 'react'
import { Activity, CircleCheck, Files, Gauge, TriangleAlert } from 'lucide-react'
import { useMediaStore } from '../../explorer/store/mediaStore'
import { useAnnotationStore } from '../../annotations/store/annotationStore'
import { useLibraryStore } from '../store/libraryStore'
import { formatBytes, formatDuration } from '../../../utils/media'
import { DuplicateReview } from './DuplicateReview'

export function LibraryHealth() {
  const [section, setSection] = useState<'overview' | 'duplicates'>('overview')
  const assetsById = useMediaStore((state) => state.assetsById)
  const orderedIds = useMediaStore((state) => state.orderedIds)
  const annotations = useAnnotationStore((state) => state.annotationsByMediaId)
  const tagCount = useAnnotationStore((state) => state.orderedTagIds.length)
  const diagnostics = useLibraryStore((state) => state.scanDiagnostics)
  const scanStatus = useLibraryStore((state) => state.scanStatus)
  const scanPhase = useLibraryStore((state) => state.scanPhase)
  const assets = orderedIds.flatMap((id) => assetsById[id] ? [assetsById[id]] : [])
  const totalBytes = assets.reduce((total, asset) => total + asset.size, 0)
  const totalDuration = assets.reduce((total, asset) => total + (asset.duration ?? 0), 0)
  const knownDurations = assets.filter((asset) => asset.duration !== undefined).length
  const folders = new Set(assets.map((asset) => asset.pathParts.join('/')).filter(Boolean)).size
  const favorites = orderedIds.filter((id) => annotations[id]?.favorite).length
  const assignments = orderedIds.reduce((total, id) => total + (annotations[id]?.tagIds.length ?? 0), 0)
  const ready = assets.filter((asset) => asset.thumbnailStatus === 'ready').length
  const errors = assets.filter((asset) => asset.thumbnailStatus === 'error').length
  const formats = assets.reduce<Record<string, number>>((counts, asset) => {
    const key = asset.extension.slice(1).toUpperCase()
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})

  return (
    <div className="mx-auto mt-8 max-w-5xl space-y-6">
      <section className="grid gap-px bg-white/7 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Videos" value={String(assets.length)} detail={Object.entries(formats).map(([format, count]) => `${format} ${count}`).join(' · ') || 'No media'} />
        <Stat label="Library size" value={formatBytes(totalBytes)} detail={`${folders} folders`} />
        <Stat label="Known duration" value={formatDuration(totalDuration)} detail={`${knownDurations} of ${assets.length} measured`} />
        <Stat label="Annotations" value={`${favorites} favorites`} detail={`${tagCount} tags · ${assignments} assignments`} />
      </section>

      <div className="flex gap-2" role="tablist" aria-label="Library health sections">
        <button type="button" role="tab" aria-selected={section === 'overview'} onClick={() => setSection('overview')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-black ${section === 'overview' ? 'bg-primary text-white' : 'border border-white/8 text-on-secondary hover:text-white'}`}><Gauge size={16} />Overview</button>
        <button type="button" role="tab" aria-selected={section === 'duplicates'} onClick={() => setSection('duplicates')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-black ${section === 'duplicates' ? 'bg-primary text-white' : 'border border-white/8 text-on-secondary hover:text-white'}`}><Files size={16} />Duplicates</button>
      </div>

      {section === 'duplicates' ? <DuplicateReview assets={assets} /> : <section className="border border-white/7 bg-surface-container p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black"><Activity size={19} className="text-primary-fixed-dim" /> Scan health</h3>
            <p className="mt-1 text-sm text-on-secondary">Latest scan session, capped at 100 distinct issues.</p>
          </div>
          <div className="flex gap-2 text-xs font-bold text-on-secondary">
            <span className="border border-white/8 px-3 py-2">Status: {scanStatus}</span>
            <span className="border border-white/8 px-3 py-2">Thumbnails: {ready} ready · {errors} failed</span>
          </div>
        </div>
        {diagnostics.length === 0 ? (
          <div className="mt-6 flex items-center gap-4 border border-emerald-300/15 bg-emerald-400/5 p-5 text-emerald-200">
            <CircleCheck size={22} /><div><p className="font-black">No scan issues recorded</p><p className="mt-1 text-sm text-on-secondary">Current phase: {scanPhase}. Metadata, folder access, and thumbnail failures will appear here.</p></div>
          </div>
        ) : (
          <ul className="mt-6 max-h-96 space-y-2 overflow-y-auto">
            {diagnostics.map((item, index) => (
              <li key={`${item.timestamp}-${index}`} className="flex gap-4 border border-amber-300/12 bg-amber-400/4 p-4">
                <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-200" />
                <div className="min-w-0"><p className="truncate text-sm font-black">{item.path}</p><p className="mt-1 text-xs leading-5 text-on-secondary">{item.stage}: {item.message}</p></div>
              </li>
            ))}
          </ul>
        )}
      </section>}
    </div>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="bg-surface-container p-6"><p className="text-xs font-black uppercase tracking-wider text-on-secondary">{label}</p><p className="mt-3 text-2xl font-black">{value}</p><p className="mt-2 text-xs text-on-secondary">{detail}</p></div>
}
