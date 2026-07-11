import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ClipboardCheck, FolderSearch, Maximize, X } from 'lucide-react'
import { useMediaStore } from '../../explorer/store/mediaStore'
import { usePlayerStore } from '../store/playerStore'
import { usePlayerMediaUrls } from '../hooks/usePlayerMediaUrls'
import { PlayerVideo } from './PlayerVideo'
import { PlayerOverlayMetadata } from './PlayerOverlayMetadata'
import { PlayerEdgeZones } from './PlayerEdgeZones'
import { PlayerAnnotationControls } from './PlayerAnnotationControls'
import { usePlaybackStore } from '../../playback/store/playbackStore'
import { getLibraryRelativeMediaPath } from '../../library/services/mediaFileSource'
import { copyTextToClipboard } from '../../../utils/clipboard'
import { TooltipIconButton } from '../../../components/controls/TooltipIconButton'
import { useSettingsStore } from '../../settings/store/settingsStore'

export function PlayerModal() {
  const selectedAssetId = usePlayerStore((state) => state.selectedAssetId)
  const queueIds = usePlayerStore((state) => state.queueIds)
  const closePlayer = usePlayerStore((state) => state.closePlayer)
  const selectNext = usePlayerStore((state) => state.selectNext)
  const selectPrevious = usePlayerStore((state) => state.selectPrevious)
  const asset = useMediaStore((state) =>
    selectedAssetId ? state.assetsById[selectedAssetId] : undefined,
  )
  const src = usePlayerMediaUrls(selectedAssetId, queueIds)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [didCopyPath, setDidCopyPath] = useState(false)
  const playback = usePlaybackStore((state) => selectedAssetId ? state.recordsByMediaId[selectedAssetId] : undefined)
  const updateProgress = usePlaybackStore((state) => state.updateProgress)
  const recordCompletion = usePlaybackStore((state) => state.recordCompletion)
  const markWatched = usePlaybackStore((state) => state.markWatched)
  const defaultVolume = useSettingsStore((state) => state.defaultVolume)
  const defaultPlaybackRate = useSettingsStore((state) => state.defaultPlaybackRate)

  useEffect(() => {
    if (!selectedAssetId) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      if (event.key === 'ArrowRight') selectNext()
      else if (event.key === 'ArrowLeft') selectPrevious()
      else if (event.key === 'Escape') {
        if (document.fullscreenElement) void document.exitFullscreen()
        else closePlayer()
      } else if (event.key.toLowerCase() === 'f') {
        void frameRef.current?.requestFullscreen()
      } else if (event.key === ' ') {
        event.preventDefault()
        const video = videoRef.current
        if (!video) return
        if (video.paused) void video.play()
        else video.pause()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closePlayer, selectNext, selectPrevious, selectedAssetId])

  if (!selectedAssetId || !asset) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${asset.name}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePlayer()
      }}
    >
      <div ref={frameRef} className="relative flex h-full w-full max-w-[1500px] items-center justify-center bg-black/95 px-0 lg:px-20">
      <div ref={containerRef} className="relative aspect-video max-h-[calc(100vh-40px)] w-full overflow-hidden border border-white/10 bg-black shadow-2xl">
        <PlayerVideo ref={videoRef} src={src} title={asset.name} resumeAt={playback?.positionSeconds ?? 0} defaultVolume={defaultVolume} defaultPlaybackRate={defaultPlaybackRate} onProgress={(position, duration) => updateProgress(asset.id, position, duration)} onComplete={(duration) => recordCompletion(asset.id, duration)} />
        <PlayerOverlayMetadata asset={asset} />
        <PlayerEdgeZones
          canNavigate={queueIds.length > 1}
          onPrevious={selectPrevious}
          onNext={selectNext}
        />
        <div className="absolute right-4 top-4 z-20 flex gap-2">
          <PlayerAnnotationControls mediaId={asset.id} />
          <TooltipIconButton label={playback?.watched ? 'Mark as unwatched' : 'Mark as watched'} onClick={() => markWatched(asset.id, !playback?.watched)} className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur ${playback?.watched ? 'border-emerald-300/50 bg-emerald-500/25 text-emerald-200' : 'border-white/10 bg-black/55 text-white hover:bg-black/80'}`} aria-pressed={playback?.watched ?? false}><CheckCircle2 size={18} /></TooltipIconButton>
          <TooltipIconButton label={didCopyPath ? 'Relative path copied' : 'Copy library-relative path'} onClick={() => { void copyTextToClipboard(getLibraryRelativeMediaPath(asset.pathParts, asset.name)).then(() => { setDidCopyPath(true); window.setTimeout(() => setDidCopyPath(false), 1800) }).catch(() => setDidCopyPath(false)) }} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/80">{didCopyPath ? <ClipboardCheck size={18} /> : <FolderSearch size={18} />}</TooltipIconButton>
          <TooltipIconButton
            label="Enter fullscreen"
            onClick={() => void frameRef.current?.requestFullscreen()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/80"
          >
            <Maximize size={18} />
          </TooltipIconButton>
          <TooltipIconButton
            label="Close player"
            onClick={closePlayer}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/80"
          >
            <X size={20} />
          </TooltipIconButton>
        </div>
      </div>
      </div>
    </div>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  )
}
