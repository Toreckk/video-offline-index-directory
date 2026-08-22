import { useRef, useState, type ChangeEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { useAnnotationStore } from '../store/annotationStore'
import { mergeAnnotationExport, parseAnnotationExport } from '../services/annotationTransfer'
import { formatBytes } from '../../../utils/media'
import { useCollectionStore } from '../../collections/store/collectionStore'
import { usePlaybackStore } from '../../playback/store/playbackStore'
import { useLibraryStore } from '../../library/store/libraryStore'
import {
  createLibraryMetadataExport,
  mergeLibraryMetadata,
  parseLibraryMetadataExport,
} from '../../library/services/libraryMetadataTransfer'

export function AnnotationTransferPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const exportAnnotations = () => {
    const annotationState = useAnnotationStore.getState()
    const collectionState = useCollectionStore.getState()
    const playbackState = usePlaybackStore.getState()
    const libraryState = useLibraryStore.getState()
    const data = createLibraryMetadataExport({
      libraryId: libraryState.libraryId,
      libraryName: libraryState.directoryName,
      annotations: annotationState,
      favoriteTagIds: annotationState.favoriteTagIds,
      collectionsById: collectionState.collectionsById,
      orderedCollectionIds: collectionState.orderedCollectionIds,
      playback: playbackState,
    })
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `void-library-metadata-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage(`Exported ${data.annotations.t.length} tags, ${data.annotations.a.length} annotated videos, ${data.collections.length} collections, and ${data.playback.length} playback records in ${formatBytes(blob.size)}.`)
  }

  const importAnnotations = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const raw = JSON.parse(await file.text()) as unknown
      if (isLibraryMetadataBackup(raw)) {
        const imported = parseLibraryMetadataExport(raw)
        const annotationState = useAnnotationStore.getState()
        const collectionState = useCollectionStore.getState()
        const merged = mergeLibraryMetadata({
          libraryId: useLibraryStore.getState().libraryId,
          annotations: annotationState,
          favoriteTagIds: annotationState.favoriteTagIds,
          collectionsById: collectionState.collectionsById,
          orderedCollectionIds: collectionState.orderedCollectionIds,
          playback: usePlaybackStore.getState(),
        }, imported)
        annotationState.mergeAnnotationData(merged.annotations)
        useAnnotationStore.setState({ favoriteTagIds: merged.favoriteTagIds })
        useCollectionStore.setState({
          collectionsById: merged.collectionsById,
          orderedCollectionIds: merged.orderedCollectionIds,
        })
        usePlaybackStore.setState(merged.playback)
        setMessage(`Imported ${imported.annotations.tags.length} tags, ${merged.importedCollections} new collections, and ${Object.keys(imported.playback.recordsByMediaId).length} playback records. Media paths were mapped to the current library.`)
        return
      }
      const imported = parseAnnotationExport(raw)
      const state = useAnnotationStore.getState()
      const merged = mergeAnnotationExport(state, imported)
      state.mergeAnnotationData(merged)
      setMessage(`Imported ${imported.tags.length} tags and ${imported.annotations.length} annotated videos. Existing data was merged.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not import this backup.')
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-5 px-5 py-5">
      <div className="max-w-xl">
        <p className="font-bold">Library metadata backup</p>
        <p className="mt-1 text-sm leading-6 text-on-secondary">Export or merge tags, favorites, smart collections, and playback history as portable JSON. Imports map library-relative media paths onto the currently selected library. Older annotation-only backups remain supported.</p>
        {message && <p className="mt-2 text-xs text-primary-fixed-dim" role="status">{message}</p>}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={exportAnnotations} className="flex items-center gap-2 border border-white/10 px-4 py-2.5 text-sm font-bold"><Download size={16} /> Export</button>
        <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-2 bg-primary px-4 py-2.5 text-sm font-black"><Upload size={16} /> Import</button>
        <input ref={inputRef} type="file" accept="application/json,.json" onChange={(event) => void importAnnotations(event)} className="hidden" />
      </div>
    </div>
  )
}

function isLibraryMetadataBackup(value: unknown) {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'void-library-metadata'
}
