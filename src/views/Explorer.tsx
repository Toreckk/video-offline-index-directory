import HomePage from '../components/homepage/HomePage'
import Library from '../components/library/Library'
import { useMediaStore } from '../features/explorer/store/mediaStore'
import { useLibraryStore } from '../features/library/store/libraryStore'

export default function Explorer() {
  const mediaCount = useMediaStore((state) => state.orderedIds.length)
  const scanStatus = useLibraryStore((state) => state.scanStatus)
  const scanError = useLibraryStore((state) => state.scanError)

  if (mediaCount > 0) return <Library />

  if (scanStatus === 'scanning') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-surface-dim px-6 text-center">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <h2 className="mt-6 text-2xl font-black">Discovering your library</h2>
          <p className="mt-2 text-on-secondary">
            Videos will appear here as soon as their metadata is indexed.
          </p>
        </div>
      </div>
    )
  }

  if (scanStatus === 'error') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-surface-dim px-6 text-center">
        <div className="max-w-md border border-red-300/15 bg-red-500/5 p-8">
          <h2 className="text-2xl font-black">Indexing stopped</h2>
          <p className="mt-3 leading-6 text-on-secondary">{scanError}</p>
        </div>
      </div>
    )
  }

  return <HomePage />
}
