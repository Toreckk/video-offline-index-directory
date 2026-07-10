import { CheckCircle2, LoaderCircle, X } from 'lucide-react'
import { VIEW_IDS } from '../../../app/views'
import { useAppNavigation } from '../../../app/navigationContext'
import { useLibraryStore } from '../store/libraryStore'

type LibraryStatusOverlayProps = {
  successDismissed: boolean
  onDismissSuccess: () => void
}

export function LibraryStatusOverlay({
  successDismissed,
  onDismissSuccess,
}: LibraryStatusOverlayProps) {
  const { navigate } = useAppNavigation()
  const scanStatus = useLibraryStore((state) => state.scanStatus)
  const scanPhase = useLibraryStore((state) => state.scanPhase)
  const progress = useLibraryStore((state) => state.scanProgress)
  const isBackgroundScanning = useLibraryStore(
    (state) => state.isBackgroundScanning,
  )

  if (scanStatus === 'scanning' && isBackgroundScanning) {
    return (
      <button
        type="button"
        onClick={() => navigate(VIEW_IDS.folders)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 border border-primary/25 bg-surface-container-high px-5 py-4 text-left shadow-xl"
      >
        <LoaderCircle className="animate-spin text-primary-fixed-dim" size={20} />
        <span>
          <span className="block text-sm font-black">Indexing library</span>
          <span className="mt-1 block text-xs text-on-secondary">
            {progress.videosFound} videos found · view progress
          </span>
        </span>
      </button>
    )
  }

  if (scanStatus === 'ready' && !successDismissed) {
    const thumbnailsPending = scanPhase === 'thumbnails'
    return (
      <div className="fixed bottom-6 right-6 z-40 w-[360px] border border-emerald-300/20 bg-surface-container-high p-5 shadow-xl">
        <div className="flex gap-3">
          <CheckCircle2 className="shrink-0 text-emerald-300" size={22} />
          <div className="min-w-0 flex-1">
            <p className="font-black">Library ready</p>
            <p className="mt-1 text-sm leading-5 text-on-secondary">
              {progress.videosFound} videos indexed
              {thumbnailsPending ? '; thumbnails are finishing in the background.' : '.'}
            </p>
            <button
              type="button"
              onClick={() => {
                navigate(VIEW_IDS.explorer)
                onDismissSuccess()
              }}
              className="mt-4 bg-primary px-4 py-2 text-xs font-black uppercase tracking-wider"
            >
              Start Exploring
            </button>
          </div>
          <button
            type="button"
            onClick={onDismissSuccess}
            className="self-start p-1 text-on-secondary hover:text-white"
            aria-label="Dismiss library ready message"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    )
  }

  return null
}
