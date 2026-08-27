import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Files,
  LoaderCircle,
  Play,
  ScanSearch,
  ShieldCheck,
  Tags,
  Trash2,
} from 'lucide-react'
import { getVoidPlatform } from '@void/core'
import type { MediaAsset } from '../../media/store/mediaStore'
import { useMediaStore } from '../../media/store/mediaStore'
import { useThumbnailUrl } from '../../explorer/hooks/useThumbnailUrl'
import { useAnnotationStore } from '../../annotations/store/annotationStore'
import { usePlaybackStore } from '../../playback/store/playbackStore'
import { usePlayerStore } from '../../player/store/playerStore'
import { useLibraryStore } from '../store/libraryStore'
import { saveMediaCatalog } from '../../media/services/mediaCatalogCache'
import { copyTextToClipboard } from '../../../utils/clipboard'
import { formatBytes, formatDuration, getDisplayPath } from '../../../utils/media'
import {
  detectDuplicateMedia,
  type DuplicateGroupResult,
  type DuplicateScanResult,
} from '../services/duplicateDetection'

export function DuplicateReview({ assets }: { assets: readonly MediaAsset[] }) {
  const [result, setResult] = useState<DuplicateScanResult | null>(null)
  const [progress, setProgress] = useState({ processed: 0, total: 0 })
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cleanupReport, setCleanupReport] = useState<{ message: string; details?: string } | null>(null)
  const activeScanRef = useRef<AbortController | null>(null)

  useEffect(() => () => activeScanRef.current?.abort(), [])

  const runScan = async () => {
    activeScanRef.current?.abort()
    const controller = new AbortController()
    activeScanRef.current = controller
    setIsScanning(true)
    setError(null)
    setCleanupReport(null)
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

  const removeAssetsFromResult = (removedIds: readonly string[]) => {
    const removed = new Set(removedIds)
    const prune = (groups: DuplicateGroupResult[]) => groups.flatMap((group) => {
      const remaining = group.assets.filter((asset) => !removed.has(asset.id))
      return remaining.length > 1 ? [{ ...group, assets: remaining }] : []
    })
    setResult((current) => current ? {
      ...current,
      exactGroups: prune(current.exactGroups),
      probableGroups: prune(current.probableGroups),
    } : current)
  }

  return (
    <section className="border border-white/7 bg-surface-container p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <h3 className="flex items-center gap-2 text-lg font-black"><ScanSearch size={20} className="text-primary-fixed-dim" /> Duplicate review</h3>
          <p className="mt-2 text-sm leading-6 text-on-secondary">Desktop scans every byte to identify exact copies. Sample, filename, size, duration, dimensions, and codec evidence remain clearly labeled as probable and can never enable cleanup.</p>
        </div>
        <button type="button" onClick={() => void runScan()} disabled={isScanning || assets.length < 2} className="flex items-center gap-2 bg-primary px-5 py-3 text-sm font-black disabled:opacity-40">
          {isScanning ? <LoaderCircle size={18} className="animate-spin" /> : <ScanSearch size={18} />}
          {result ? 'Scan again' : 'Scan for duplicates'}
        </button>
      </div>

      {isScanning && <div className="mt-5 border border-primary/20 bg-primary/5 p-4 text-sm"><p className="font-black">Checking same-size candidates…</p><p className="mt-1 text-on-secondary">{progress.total ? `${progress.processed} of ${progress.total} candidates checked` : 'Grouping files by size…'}</p></div>}
      {error && <p className="mt-5 border border-red-300/20 bg-red-500/5 p-4 text-sm text-red-200">{error}</p>}
      {cleanupReport && <div className="mt-5 border border-emerald-300/20 bg-emerald-500/5 p-4 text-sm text-emerald-100">
        <p className="flex items-center gap-2 font-black"><CheckCircle2 size={16} />{cleanupReport.message}</p>
        {cleanupReport.details && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-amber-100">{cleanupReport.details}</p>}
      </div>}

      {!result && !isScanning && <div className="mt-6 border border-dashed border-white/10 p-8 text-center text-sm text-on-secondary">Analysis runs only when requested and never modifies a file by itself.</div>}

      {result && !isScanning && <div className="mt-6 space-y-8">
        <div className="grid gap-px bg-white/7 sm:grid-cols-3">
          <Summary label="Exact groups" value={result.exactGroups.length} />
          <Summary label="Probable groups" value={result.probableGroups.length} />
          <Summary label={result.fingerprintKind === 'complete' ? 'Files fully hashed' : 'Files sampled'} value={result.filesHashed} />
        </div>

        <div>
          <h4 className="flex items-center gap-2 font-black"><ShieldCheck size={18} className="text-emerald-300" /> Exact byte-for-byte copies</h4>
          <p className="mt-1 text-xs leading-5 text-on-secondary">Every byte and file size matched. Desktop cleanup still rechecks all hashes immediately before moving selected redundant files to the Windows Recycle Bin.</p>
          <div className="mt-4 space-y-4">
            {result.exactGroups.length ? result.exactGroups.map((group) => <DuplicateGroup key={groupKey(group.assets)} group={group} onAssetsRemoved={removeAssetsFromResult} onCleanupReport={setCleanupReport} />) : <Empty message="No complete-hash matches were found." />}
          </div>
        </div>

        <div>
          <h4 className="flex items-center gap-2 font-black"><Files size={18} className="text-amber-200" /> Probable matches to review</h4>
          <p className="mt-1 text-xs leading-5 text-on-secondary">These groups share one or more clues but are not proven byte-identical. Compare them manually; cleanup is intentionally unavailable.</p>
          <div className="mt-4 space-y-4">
            {result.probableGroups.length ? result.probableGroups.map((group) => <DuplicateGroup key={groupKey(group.assets)} group={group} onAssetsRemoved={removeAssetsFromResult} onCleanupReport={setCleanupReport} />) : <Empty message="No additional probable matches were found." />}
          </div>
        </div>
      </div>}
    </section>
  )
}

function DuplicateGroup({ group, onAssetsRemoved, onCleanupReport }: {
  group: DuplicateGroupResult
  onAssetsRemoved: (ids: readonly string[]) => void
  onCleanupReport: (report: { message: string; details?: string } | null) => void
}) {
  const { assets, classification, completeHash } = group
  const [keeperId, setKeeperId] = useState(assets[0]?.id ?? '')
  const [removalIds, setRemovalIds] = useState(() => assets.slice(1).map((asset) => asset.id))
  const [message, setMessage] = useState<string | null>(null)
  const [cleanupError, setCleanupError] = useState<string | null>(null)
  const [isConfirmingCleanup, setIsConfirmingCleanup] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const annotations = useAnnotationStore((state) => state.annotationsByMediaId)
  const playback = usePlaybackStore((state) => state.recordsByMediaId)
  const mergeMediaAnnotations = useAnnotationStore((state) => state.mergeMediaAnnotations)
  const moveMediaAnnotations = useAnnotationStore((state) => state.moveMediaAnnotations)
  const mergePlaybackRecords = usePlaybackStore((state) => state.mergePlaybackRecords)
  const movePlaybackRecords = usePlaybackStore((state) => state.movePlaybackRecords)
  const openPlayer = usePlayerStore((state) => state.openPlayer)
  const ids = useMemo(() => assets.map((asset) => asset.id), [assets])
  const keeper = assets.find((asset) => asset.id === keeperId)
  const platform = getVoidPlatform()
  const canCleanup = classification === 'exact' && Boolean(
    completeHash &&
    platform.capabilities.recycleBinCleanup &&
    platform.cleanupDuplicateFiles &&
    assets.every((asset) => asset.source.kind === 'desktop-path'),
  )

  const selectKeeper = (id: string) => {
    setKeeperId(id)
    setRemovalIds(assets.filter((asset) => asset.id !== id).map((asset) => asset.id))
    setMessage(null)
    setCleanupError(null)
    setIsConfirmingCleanup(false)
  }

  const mergeMetadata = () => {
    if (!keeper) return
    const sources = ids.filter((id) => id !== keeper.id)
    mergeMediaAnnotations(keeper.id, sources)
    mergePlaybackRecords(keeper.id, sources)
    setMessage(`Metadata copied to ${keeper.name}. Source records and files were left unchanged.`)
  }

  const cleanupDuplicates = async () => {
    if (!canCleanup || !keeper || keeper.source.kind !== 'desktop-path' || !completeHash || !platform.cleanupDuplicateFiles) return
    const redundant = assets.filter((asset) => removalIds.includes(asset.id) && asset.source.kind === 'desktop-path')
    if (!redundant.length) return
    setIsCleaning(true)
    setCleanupError(null)
    setMessage(null)
    onCleanupReport(null)
    const redundantIds = redundant.map((asset) => asset.id)
    mergeMediaAnnotations(keeper.id, redundantIds)
    mergePlaybackRecords(keeper.id, redundantIds)
    try {
      const cleanup = await platform.cleanupDuplicateFiles({
        keeper: { absolutePath: keeper.source.absolutePath, expectedSha256: completeHash },
        redundantFiles: redundant.map((asset) => {
          if (asset.source.kind !== 'desktop-path') throw new Error('Cleanup requires native media paths.')
          return {
            absolutePath: asset.source.absolutePath,
            expectedSha256: completeHash,
          }
        }),
      })
      const movedPaths = new Set(cleanup.movedPaths.map(normalizePath))
      const movedIds = redundant
        .filter((asset) => asset.source.kind === 'desktop-path' && movedPaths.has(normalizePath(asset.source.absolutePath)))
        .map((asset) => asset.id)
      if (movedIds.length) {
        moveMediaAnnotations(keeper.id, movedIds)
        movePlaybackRecords(keeper.id, movedIds)
        const mediaStore = useMediaStore.getState()
        const remainingIds = mediaStore.orderedIds.filter((id) => !movedIds.includes(id))
        mediaStore.retainAssets(remainingIds)
        const libraryStore = useLibraryStore.getState()
        libraryStore.setMediaIds(remainingIds)
        if (libraryStore.libraryId) {
          await saveMediaCatalog(
            libraryStore.libraryId,
            remainingIds.flatMap((id) => useMediaStore.getState().assetsById[id] ? [useMediaStore.getState().assetsById[id]] : []),
            libraryStore.rootPath ?? undefined,
          )
        }
        onAssetsRemoved(movedIds)
      }
      const reportMessage = `${movedIds.length} file${movedIds.length === 1 ? '' : 's'} moved to the Recycle Bin. ${cleanup.skipped.length} skipped · ${cleanup.failed.length} failed.`
      const reportDetails = cleanup.skipped.length || cleanup.failed.length
        ? [...cleanup.skipped, ...cleanup.failed].map((issue) => `${issue.absolutePath}: ${issue.message}`).join('\n')
        : undefined
      setMessage(reportMessage)
      onCleanupReport({ message: reportMessage, details: reportDetails })
      if (cleanup.skipped.length || cleanup.failed.length) {
        setCleanupError(reportDetails ?? null)
      }
      setIsConfirmingCleanup(false)
    } catch (error) {
      setCleanupError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsCleaning(false)
    }
  }

  return <article className="border border-white/9 bg-surface-dim/45">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/7 px-4 py-3">
      <div><span className={`text-xs font-black uppercase tracking-wider ${classification === 'exact' ? 'text-emerald-300' : 'text-amber-200'}`}>{classification === 'exact' ? 'Exact complete-hash match' : 'Probable match'}</span><span className="ml-3 text-xs text-on-secondary">{assets.length} files</span></div>
      <button type="button" onClick={() => keeper && openPlayer(keeper.id, ids)} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-black hover:border-primary/50"><Play size={14} />Compare in player</button>
      <ul className="flex w-full flex-wrap gap-2 text-[10px] font-bold text-on-secondary" aria-label="Duplicate evidence">
        {group.evidence.map((evidence) => <li key={evidence} className="border border-white/8 bg-black/15 px-2 py-1">{evidence}</li>)}
      </ul>
    </header>
    <div className="divide-y divide-white/6">
      {assets.map((asset) => <DuplicateAssetRow
        key={asset.id}
        asset={asset}
        selected={asset.id === keeperId}
        markedForRemoval={removalIds.includes(asset.id)}
        canSelectForCleanup={canCleanup}
        annotation={annotations[asset.id]}
        playbackCount={playback[asset.id]?.playCount ?? 0}
        onSelect={() => selectKeeper(asset.id)}
        onToggleRemoval={() => setRemovalIds((current) => current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id])}
      />)}
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/7 p-4">
      <p className="max-w-2xl text-xs leading-5 text-on-secondary">Choose the copy to keep. Metadata merging is non-destructive. Exact desktop groups additionally allow selected redundant files to be moved—not permanently deleted—to the Windows Recycle Bin.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={mergeMetadata} disabled={!keeper} className="flex items-center gap-2 border border-primary/50 px-4 py-2.5 text-xs font-black disabled:opacity-40"><Tags size={15} />Merge metadata only</button>
        {canCleanup && <button type="button" onClick={() => { onCleanupReport(null); setIsConfirmingCleanup(true) }} disabled={!keeper || removalIds.length === 0 || isCleaning} className="flex items-center gap-2 bg-red-500/80 px-4 py-2.5 text-xs font-black disabled:opacity-40"><Trash2 size={15} />Review Recycle Bin cleanup</button>}
      </div>
      {isConfirmingCleanup && <div className="w-full border border-red-300/20 bg-red-500/5 p-4">
        <p className="flex items-center gap-2 text-sm font-black text-red-100"><AlertTriangle size={17} />Move {removalIds.length} selected file{removalIds.length === 1 ? '' : 's'} to the Recycle Bin?</p>
        <p className="mt-2 text-xs leading-5 text-on-secondary">V.O.I.D. will merge their supported metadata into <strong className="text-white">{keeper?.name}</strong>, then re-hash every selected file. Changed files are skipped and the keeper always remains.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void cleanupDuplicates()} disabled={isCleaning} className="flex items-center gap-2 bg-red-500 px-4 py-2.5 text-xs font-black disabled:opacity-50">{isCleaning ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}Confirm Recycle Bin move</button>
          <button type="button" onClick={() => setIsConfirmingCleanup(false)} disabled={isCleaning} className="border border-white/10 px-4 py-2.5 text-xs font-black text-on-secondary hover:text-white">Cancel</button>
        </div>
      </div>}
      {message && <p className="w-full flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 size={15} />{message}</p>}
      {cleanupError && <p className="w-full whitespace-pre-wrap border border-amber-300/15 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100">{cleanupError}</p>}
    </footer>
  </article>
}

function DuplicateAssetRow({ asset, selected, markedForRemoval, canSelectForCleanup, annotation, playbackCount, onSelect, onToggleRemoval }: {
  asset: MediaAsset
  selected: boolean
  markedForRemoval: boolean
  canSelectForCleanup: boolean
  annotation: { favorite: boolean; tagIds: string[] } | undefined
  playbackCount: number
  onSelect: () => void
  onToggleRemoval: () => void
}) {
  const thumbnailUrl = useThumbnailUrl(asset.thumbnailBlobKey, asset.thumbnailStatus)
  const [copied, setCopied] = useState(false)
  const platform = getVoidPlatform()
  const canReveal = asset.source.kind === 'desktop-path' && Boolean(platform.revealFile)

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
      <p className="mt-2 text-xs text-on-secondary">{formatBytes(asset.size)} · {formatDuration(asset.duration)} · {asset.width && asset.height ? `${asset.width} × ${asset.height}` : 'dimensions unknown'} · {asset.videoCodec ?? 'codec unknown'} · {annotation?.tagIds.length ?? 0} tags · {annotation?.favorite ? 'favorite · ' : ''}{playbackCount} plays</p>
    </button>
    <div className="flex flex-col gap-2 self-center">
      {canSelectForCleanup && (selected ? <span className="border border-emerald-300/20 bg-emerald-500/5 px-3 py-2 text-center text-xs font-black text-emerald-200">Keep</span> : <label className="flex h-9 cursor-pointer items-center gap-2 border border-red-300/20 px-3 text-xs font-bold text-red-100"><input type="checkbox" checked={markedForRemoval} onChange={onToggleRemoval} />Recycle</label>)}
      <button type="button" onClick={() => void copyFilename()} className={`flex h-9 items-center gap-2 border px-3 text-xs font-bold ${copied ? 'border-emerald-300/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 text-on-secondary hover:text-white'}`} aria-label={copied ? `Copied filename ${asset.name}` : `Copy filename for ${asset.name}`}>{copied ? <><CheckCircle2 size={14} />Copied!</> : <><Copy size={14} />Filename</>}</button>
      {canReveal && <button type="button" onClick={() => asset.source.kind === 'desktop-path' && void platform.revealFile?.(asset.source.absolutePath)} className="flex h-9 items-center gap-2 border border-white/10 px-3 text-xs font-bold text-on-secondary hover:text-white"><ExternalLink size={14} />Show file</button>}
    </div>
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

function normalizePath(path: string) {
  return path.replaceAll('\\', '/').toLocaleLowerCase()
}
