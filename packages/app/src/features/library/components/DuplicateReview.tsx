import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Copy, Files, LoaderCircle, Play, ScanSearch, ShieldCheck, Tags } from 'lucide-react'
import type { MediaAsset } from '../../explorer/store/mediaStore'
import { useThumbnailUrl } from '../../explorer/hooks/useThumbnailUrl'
import { useAnnotationStore } from '../../annotations/store/annotationStore'
import { usePlaybackStore } from '../../playback/store/playbackStore'
import { usePlayerStore } from '../../player/store/playerStore'
import { copyTextToClipboard } from '../../../utils/clipboard'
import { formatBytes, formatDuration, getDisplayPath } from '../../../utils/media'
import { detectDuplicateMedia, type DuplicateScanResult } from '../services/duplicateDetection'

export function DuplicateReview({ assets }: { assets: readonly MediaAsset[] }) {
  const [result, setResult] = useState<DuplicateScanResult | null>(null)
  const [progress, setProgress] = useState({ processed: 0, total: 0 })
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeScanRef = useRef<AbortController | null>(null)

  useEffect(() => () => activeScanRef.current?.abort(), [])

  const runScan = async () => {
    activeScanRef.current?.abort()
    const controller = new AbortController()
    activeScanRef.current = controller
    setIsScanning(true)
    setError(null)
    setProgress({ processed: 0, total: 0 })
    try {
      const nextResult = await detectDuplicateMedia(assets, {
        signal: controller.signal,
        onProgress: (processed, total) => setProgress({ processed, total }),
      })
      if (!controller.signal.aborted) setResult(nextResult)
    } catch (scanError) {
      if (!(scanError instanceof DOMException && scanError.name === 'AbortError')) {
        setError(scanError instanceof Error ? scanError.message : 'Duplicate analysis failed.')
      }
    } finally {
      if (activeScanRef.current === controller) {
        activeScanRef.current = null
        setIsScanning(false)
      }
    }
  }

  const nameCollisionGroups = useMemo(() => result?.nameCollisionGroups.filter((collision) =>
    !result.highConfidenceGroups.some((duplicates) => collision.every((asset) => duplicates.some((item) => item.id === asset.id))),
  ) ?? [], [result])

  return (
    <section className="border border-white/7 bg-surface-container p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <h3 className="flex items-center gap-2 text-lg font-black"><ScanSearch size={20} className="text-primary-fixed-dim" /> Duplicate review</h3>
          <p className="mt-2 text-sm leading-6 text-on-secondary">Find high-confidence matches using file size plus samples from the beginning, middle, and end. Same-name files are listed separately for manual review.</p>
        </div>
        <button type="button" onClick={() => void runScan()} disabled={isScanning || assets.length < 2} className="flex items-center gap-2 bg-primary px-5 py-3 text-sm font-black disabled:opacity-40">
          {isScanning ? <LoaderCircle size={18} className="animate-spin" /> : <ScanSearch size={18} />}
          {result ? 'Scan again' : 'Scan for duplicates'}
        </button>
      </div>

      {isScanning && <div className="mt-5 border border-primary/20 bg-primary/5 p-4 text-sm"><p className="font-black">Reading small file samples…</p><p className="mt-1 text-on-secondary">{progress.total ? `${progress.processed} of ${progress.total} same-size candidates checked` : 'Grouping files by size…'}</p></div>}
      {error && <p className="mt-5 border border-red-300/20 bg-red-500/5 p-4 text-sm text-red-200">{error}</p>}

      {!result && !isScanning && <div className="mt-6 border border-dashed border-white/10 p-8 text-center text-sm text-on-secondary">Analysis runs only when requested and never modifies or deletes a file.</div>}

      {result && !isScanning && <div className="mt-6 space-y-8">
        <div className="grid gap-px bg-white/7 sm:grid-cols-3">
          <Summary label="High-confidence groups" value={result.highConfidenceGroups.length} />
          <Summary label="Filename collisions" value={nameCollisionGroups.length} />
          <Summary label="Files sampled" value={result.filesHashed} />
        </div>

        <div>
          <h4 className="flex items-center gap-2 font-black"><ShieldCheck size={18} className="text-emerald-300" /> High-confidence matches</h4>
          <p className="mt-1 text-xs leading-5 text-on-secondary">Matching samples are strong evidence, but compare the videos before removing anything outside VOID.</p>
          <div className="mt-4 space-y-4">
            {result.highConfidenceGroups.length ? result.highConfidenceGroups.map((group) => <DuplicateGroup key={groupKey(group)} assets={group} confidence="high" />) : <Empty message="No sampled-content matches were found." />}
          </div>
        </div>

        <div>
          <h4 className="flex items-center gap-2 font-black"><Files size={18} className="text-amber-200" /> Same-name files to review</h4>
          <p className="mt-1 text-xs leading-5 text-on-secondary">The same filename can legitimately exist in different folders. These are not treated as confirmed duplicates.</p>
          <div className="mt-4 space-y-4">
            {nameCollisionGroups.length ? nameCollisionGroups.map((group) => <DuplicateGroup key={groupKey(group)} assets={group} confidence="name-only" />) : <Empty message="No additional filename collisions were found." />}
          </div>
        </div>
      </div>}
    </section>
  )
}

function DuplicateGroup({ assets, confidence }: { assets: MediaAsset[]; confidence: 'high' | 'name-only' }) {
  const [keeperId, setKeeperId] = useState(assets[0]?.id ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const annotations = useAnnotationStore((state) => state.annotationsByMediaId)
  const playback = usePlaybackStore((state) => state.recordsByMediaId)
  const mergeMediaAnnotations = useAnnotationStore((state) => state.mergeMediaAnnotations)
  const mergePlaybackRecords = usePlaybackStore((state) => state.mergePlaybackRecords)
  const openPlayer = usePlayerStore((state) => state.openPlayer)
  const ids = useMemo(() => assets.map((asset) => asset.id), [assets])
  const keeper = assets.find((asset) => asset.id === keeperId)

  const mergeMetadata = () => {
    if (!keeper) return
    const sources = ids.filter((id) => id !== keeper.id)
    mergeMediaAnnotations(keeper.id, sources)
    mergePlaybackRecords(keeper.id, sources)
    setMessage(`Metadata copied to ${keeper.name}. Source records and files were left unchanged.`)
  }

  return <article className="border border-white/9 bg-surface-dim/45">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/7 px-4 py-3">
      <div><span className={`text-xs font-black uppercase tracking-wider ${confidence === 'high' ? 'text-emerald-300' : 'text-amber-200'}`}>{confidence === 'high' ? 'Sampled content matches' : 'Filename matches only'}</span><span className="ml-3 text-xs text-on-secondary">{assets.length} files</span></div>
      <button type="button" onClick={() => keeper && openPlayer(keeper.id, ids)} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-black hover:border-primary/50"><Play size={14} />Compare in player</button>
    </header>
    <div className="divide-y divide-white/6">
      {assets.map((asset) => <DuplicateAssetRow key={asset.id} asset={asset} selected={asset.id === keeperId} annotation={annotations[asset.id]} playbackCount={playback[asset.id]?.playCount ?? 0} onSelect={() => { setKeeperId(asset.id); setMessage(null) }} />)}
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/7 p-4">
      <p className="max-w-2xl text-xs leading-5 text-on-secondary">Choose the copy you intend to keep. Merge copies tags, favorite state, watch history, and completed-play counts into it without deleting or clearing the others.</p>
      <button type="button" onClick={mergeMetadata} disabled={!keeper} className="flex items-center gap-2 bg-primary px-4 py-2.5 text-xs font-black disabled:opacity-40"><Tags size={15} />Merge metadata into selected</button>
      {message && <p className="w-full flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 size={15} />{message}</p>}
    </footer>
  </article>
}

function DuplicateAssetRow({ asset, selected, annotation, playbackCount, onSelect }: {
  asset: MediaAsset
  selected: boolean
  annotation: { favorite: boolean; tagIds: string[] } | undefined
  playbackCount: number
  onSelect: () => void
}) {
  const thumbnailUrl = useThumbnailUrl(asset.thumbnailBlobKey, asset.thumbnailStatus)
  const [copied, setCopied] = useState(false)

  const copyFilename = async () => {
    try {
      await copyTextToClipboard(asset.name)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return <div className={`grid gap-4 p-4 sm:grid-cols-[110px_minmax(0,1fr)_auto] ${selected ? 'bg-primary/8' : ''}`}>
    <button type="button" onClick={onSelect} className="relative aspect-video overflow-hidden border border-white/10 bg-black" aria-label={`Keep ${asset.name}`}>
      {thumbnailUrl ? <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-on-secondary">No preview</span>}
      <span className={`absolute left-2 top-2 h-4 w-4 rounded-full border-2 ${selected ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_#000]' : 'border-white/70 bg-black/50'}`} />
    </button>
    <button type="button" onClick={onSelect} className="min-w-0 text-left">
      <p className="truncate text-sm font-black">{asset.name}</p>
      <p className="mt-1 break-all text-xs leading-5 text-on-secondary">{getDisplayPath(asset.pathParts, asset.name)}</p>
      <p className="mt-2 text-xs text-on-secondary">{formatBytes(asset.size)} · {formatDuration(asset.duration)} · {asset.width && asset.height ? `${asset.width} × ${asset.height}` : 'dimensions unknown'} · {annotation?.tagIds.length ?? 0} tags · {annotation?.favorite ? 'favorite · ' : ''}{playbackCount} plays</p>
    </button>
    <button type="button" onClick={() => void copyFilename()} className={`flex h-9 items-center gap-2 self-center border px-3 text-xs font-bold ${copied ? 'border-emerald-300/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 text-on-secondary hover:text-white'}`} aria-label={copied ? `Copied filename ${asset.name}` : `Copy filename for ${asset.name}`}>{copied ? <><CheckCircle2 size={14} />Copied!</> : <><Copy size={14} />Filename</>}</button>
  </div>
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="bg-surface-container-high p-4"><p className="text-[10px] font-black uppercase tracking-wider text-on-secondary">{label}</p><p className="mt-2 text-2xl font-black tabular-nums">{value}</p></div>
}

function Empty({ message }: { message: string }) {
  return <div className="border border-dashed border-white/10 p-6 text-center text-sm text-on-secondary">{message}</div>
}

function groupKey(assets: readonly MediaAsset[]) {
  return assets.map((asset) => asset.id).sort().join('|')
}
