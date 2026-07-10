import { useEffect, useRef } from 'react'
import { Maximize, X } from 'lucide-react'
import { useMediaStore } from '../../explorer/store/mediaStore'
import { usePlayerStore } from '../store/playerStore'
import { usePlayerMediaUrls } from '../hooks/usePlayerMediaUrls'
import { PlayerVideo } from './PlayerVideo'
import { PlayerOverlayMetadata } from './PlayerOverlayMetadata'
import { PlayerEdgeZones } from './PlayerEdgeZones'
import { PlayerAnnotationControls } from './PlayerAnnotationControls'

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
        void containerRef.current?.requestFullscreen()
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${asset.name}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePlayer()
      }}
    >
      <div
        ref={containerRef}
        className="relative aspect-video max-h-[calc(100vh-40px)] w-full max-w-[1500px] overflow-hidden border border-white/10 bg-black shadow-2xl"
      >
        <PlayerVideo ref={videoRef} src={src} title={asset.name} />
        <PlayerOverlayMetadata asset={asset} />
        <PlayerEdgeZones
          canNavigate={queueIds.length > 1}
          onPrevious={selectPrevious}
          onNext={selectNext}
        />
        <div className="absolute right-4 top-4 z-20 flex gap-2">
          <PlayerAnnotationControls mediaId={asset.id} />
          <button
            type="button"
            onClick={() => void containerRef.current?.requestFullscreen()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/80"
            aria-label="Enter fullscreen"
          >
            <Maximize size={18} />
          </button>
          <button
            type="button"
            onClick={closePlayer}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/80"
            aria-label="Close player"
          >
            <X size={20} />
          </button>
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
