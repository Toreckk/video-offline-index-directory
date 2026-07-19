import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, ClipboardCheck, FolderSearch, ListVideo, Maximize, PanelRightClose, PanelRightOpen, Repeat, Repeat1, Shuffle, Sparkles, Tags, X } from 'lucide-react'
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
import { MediaTagEditor } from '../../annotations/components/MediaTagEditor'

export function PlayerModal() {
  const selectedAssetId = usePlayerStore((state) => state.selectedAssetId)
  const queueIds = usePlayerStore((state) => state.queueIds)
  const closePlayer = usePlayerStore((state) => state.closePlayer)
  const selectNext = usePlayerStore((state) => state.selectNext)
  const selectPrevious = usePlayerStore((state) => state.selectPrevious)
  const advanceAfterCompletion = usePlayerStore((state) => state.advanceAfterCompletion)
  const resetOrderCycle = usePlayerStore((state) => state.resetOrderCycle)
  const asset = useMediaStore((state) =>
    selectedAssetId ? state.assetsById[selectedAssetId] : undefined,
  )
  const src = usePlayerMediaUrls(selectedAssetId, queueIds)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const chromeHideTimerRef = useRef<number | null>(null)
  const [didCopyPath, setDidCopyPath] = useState(false)
  const [isTagWorkspaceOpen, setIsTagWorkspaceOpen] = useState(false)
  const [isChromeVisible, setIsChromeVisible] = useState(true)
  const playback = usePlaybackStore((state) => selectedAssetId ? state.recordsByMediaId[selectedAssetId] : undefined)
  const updateProgress = usePlaybackStore((state) => state.updateProgress)
  const recordCompletion = usePlaybackStore((state) => state.recordCompletion)
  const markWatched = usePlaybackStore((state) => state.markWatched)
  const defaultVolume = useSettingsStore((state) => state.defaultVolume)
  const defaultPlaybackRate = useSettingsStore((state) => state.defaultPlaybackRate)
  const playbackOrder = useSettingsStore((state) => state.playbackOrder)
  const repeatMode = useSettingsStore((state) => state.repeatMode)
  const updateSetting = useSettingsStore((state) => state.updateSetting)

  const hidePlayerChrome = useCallback(() => {
    if (chromeHideTimerRef.current !== null) {
      window.clearTimeout(chromeHideTimerRef.current)
      chromeHideTimerRef.current = null
    }
    setIsChromeVisible(false)
  }, [])

  const revealPlayerChrome = useCallback(() => {
    setIsChromeVisible(true)
    if (chromeHideTimerRef.current !== null) {
      window.clearTimeout(chromeHideTimerRef.current)
    }
    chromeHideTimerRef.current = window.setTimeout(() => {
      chromeHideTimerRef.current = null
      setIsChromeVisible(false)
    }, PLAYER_CHROME_HIDE_DELAY_MS)
  }, [])

  useEffect(() => {
    if (!selectedAssetId) return
    const revealTimerId = window.setTimeout(revealPlayerChrome, 0)
    window.addEventListener('blur', hidePlayerChrome)
    return () => {
      window.clearTimeout(revealTimerId)
      window.removeEventListener('blur', hidePlayerChrome)
      if (chromeHideTimerRef.current !== null) {
        window.clearTimeout(chromeHideTimerRef.current)
        chromeHideTimerRef.current = null
      }
    }
  }, [hidePlayerChrome, revealPlayerChrome, selectedAssetId])

  useEffect(() => {
    if (!selectedAssetId) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      if (event.key === 'ArrowRight') selectNext(playbackOrder)
      else if (event.key === 'ArrowLeft') selectPrevious(playbackOrder)
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
  }, [closePlayer, playbackOrder, selectNext, selectPrevious, selectedAssetId])

  if (!selectedAssetId || !asset) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-2 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${asset.name}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePlayer()
      }}
    >
      <div
        ref={frameRef}
        className={`relative flex h-full w-full overflow-hidden border border-white/10 bg-black/95 shadow-2xl ${isChromeVisible ? '' : 'cursor-none'}`}
        onPointerEnter={revealPlayerChrome}
        onPointerMove={revealPlayerChrome}
        onPointerDown={revealPlayerChrome}
        onPointerLeave={hidePlayerChrome}
        onFocusCapture={revealPlayerChrome}
      >
      <div className="relative flex min-w-0 flex-1 items-center justify-center">
      <div ref={containerRef} className="relative aspect-video max-h-full w-full border border-white/10 bg-black">
        <PlayerVideo ref={videoRef} src={src} title={asset.name} resumeAt={playback?.positionSeconds ?? 0} defaultVolume={defaultVolume} defaultPlaybackRate={defaultPlaybackRate} onProgress={(position, duration) => updateProgress(asset.id, position, duration)} onComplete={(duration) => {
          recordCompletion(asset.id, duration)
          const result = advanceAfterCompletion(playbackOrder, repeatMode)
          if (result === 'replay' && videoRef.current) {
            videoRef.current.currentTime = 0
            void videoRef.current.play()
          }
        }} />
        <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${isChromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <PlayerOverlayMetadata asset={asset} />
          <PlayerEdgeZones
            canNavigate={queueIds.length > 1}
            onPrevious={() => selectPrevious(playbackOrder)}
            onNext={() => selectNext(playbackOrder)}
          />
        </div>
        <div className={`absolute right-4 top-4 z-20 flex gap-2 transition-opacity duration-300 ${isChromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <TooltipIconButton
            label={`Playback order: ${PLAYBACK_ORDER_LABELS[playbackOrder]}. Click to change.`}
            onClick={() => {
              const nextOrder = nextValue(PLAYBACK_ORDERS, playbackOrder)
              updateSetting('playbackOrder', nextOrder)
              resetOrderCycle()
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white backdrop-blur hover:border-primary/60 hover:bg-black/90"
          >
            {playbackOrder === 'displayed' ? <ListVideo size={17} /> : playbackOrder === 'shuffle' ? <Shuffle size={17} /> : <Sparkles size={17} />}
          </TooltipIconButton>
          <TooltipIconButton
            label={`Repeat: ${REPEAT_MODE_LABELS[repeatMode]}. Click to change.`}
            onClick={() => updateSetting('repeatMode', nextValue(REPEAT_MODES, repeatMode))}
            className={`flex h-10 w-10 items-center justify-center rounded-full border bg-black/70 text-white backdrop-blur hover:bg-black/90 ${repeatMode === 'off' ? 'border-white/15' : 'border-primary/70'}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </TooltipIconButton>
          <PlayerAnnotationControls mediaId={asset.id} />
          <TooltipIconButton label={playback?.watched ? 'Mark as unwatched' : 'Mark as watched'} onClick={() => markWatched(asset.id, !playback?.watched)} className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur ${playback?.watched ? 'border-emerald-300/50 bg-emerald-500/25 text-emerald-200' : 'border-white/10 bg-black/55 text-white hover:bg-black/80'}`} aria-pressed={playback?.watched ?? false}><CheckCircle2 size={18} /></TooltipIconButton>
          <TooltipIconButton label={didCopyPath ? 'Relative path copied' : 'Copy library-relative path'} onClick={() => { void copyTextToClipboard(getLibraryRelativeMediaPath(asset.pathParts, asset.name)).then(() => { setDidCopyPath(true); window.setTimeout(() => setDidCopyPath(false), 1800) }).catch(() => setDidCopyPath(false)) }} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/80">{didCopyPath ? <ClipboardCheck size={18} /> : <FolderSearch size={18} />}</TooltipIconButton>
          <TooltipIconButton
            label={isTagWorkspaceOpen ? 'Close tagging workspace' : 'Open tagging workspace'}
            onClick={() => setIsTagWorkspaceOpen((current) => !current)}
            className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur ${isTagWorkspaceOpen ? 'border-primary/50 bg-primary/30 text-primary-fixed-dim' : 'border-white/10 bg-black/55 text-white hover:bg-black/80'}`}
            aria-pressed={isTagWorkspaceOpen}
          >
            {isTagWorkspaceOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </TooltipIconButton>
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
      {isTagWorkspaceOpen && <aside className="absolute inset-y-0 right-0 z-50 flex w-[min(420px,92vw)] shrink-0 flex-col border-l border-white/10 bg-surface-container-high shadow-2xl lg:static lg:z-auto lg:w-[420px] lg:shadow-none" aria-label="Docked tagging workspace">
        <header className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-black"><Tags size={17} className="text-primary-fixed-dim" />Tagging workspace</div>
          <TooltipIconButton label="Close tagging workspace" tooltipSide="left" onClick={() => setIsTagWorkspaceOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-on-secondary hover:bg-white/8 hover:text-white"><X size={18} /></TooltipIconButton>
        </header>
        <div className="min-h-0 flex-1"><MediaTagEditor key={asset.id} mediaId={asset.id} spacious /></div>
      </aside>}
      </div>
    </div>
  )
}

const PLAYBACK_ORDERS = ['displayed', 'shuffle', 'smart-shuffle'] as const
const REPEAT_MODES = ['off', 'all', 'one'] as const
const PLAYER_CHROME_HIDE_DELAY_MS = 3_000
const PLAYBACK_ORDER_LABELS = { displayed: 'Displayed order', shuffle: 'Shuffle', 'smart-shuffle': 'Smart shuffle' } as const
const REPEAT_MODE_LABELS = { off: 'Off', all: 'Repeat all', one: 'Repeat one' } as const

function nextValue<Value>(values: readonly Value[], current: Value) {
  const currentIndex = values.indexOf(current)
  return values[(currentIndex + 1) % values.length] ?? values[0]!
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  )
}
