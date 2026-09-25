import { useRef, useState, type ChangeEvent } from 'react'
import { useAnnotationStore } from '../store/annotationStore'
import { parseAnnotationExport } from '../services/annotationTransfer'
import { useCollectionStore } from '../../collections/store/collectionStore'
import { usePlaybackStore } from '../../playback/store/playbackStore'
import { useLibraryStore } from '../../library/store/libraryStore'
import { useMediaStore } from '../../media/store/mediaStore'
import { createLibraryMetadataExport, mapAnnotationExportToLibrary, mergeLibraryMetadata, parseLibraryMetadataExport, type ParsedLibraryMetadata } from '../../library/services/libraryMetadataTransfer'
import { commitUserDataImport, flushUserData } from '../../../shared/persistence/userDataCoordinator'
import { MAX_BACKUP_BYTES, parseBoundedJson } from '../../../shared/persistence/userDataValidation'
import { UserDataRecoveryPanel } from '../../../shared/persistence/UserDataRecoveryPanel'

export function AnnotationTransferPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ imported: ParsedLibraryMetadata; targetId: string | null; matched: number; unmatched: number; conflicts: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const current = () => {
    const annotations = useAnnotationStore.getState()
    const collections = useCollectionStore.getState()
    return { libraryId: useLibraryStore.getState().libraryId, annotations, favoriteTagIds: annotations.favoriteTagIds, collectionsById: collections.collectionsById, orderedCollectionIds: collections.orderedCollectionIds, playback: usePlaybackStore.getState() }
  }
  const exportAnnotations = async (all = false) => {
    try {
      await flushUserData()
      const state = current()
      const data = createLibraryMetadataExport({ ...state, libraryId: all ? null : state.libraryId, libraryName: all ? null : useLibraryStore.getState().directoryName })
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `void-${data.scope}-metadata-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage(`Exported ${data.annotations.a.length} annotated videos and ${data.playback.length} playback records. Scope: ${data.scope}. Shared tags/collections are included; settings and source videos are not.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not export metadata.') }
  }
  const importAnnotations = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPreview(null)
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('The backup exceeds the 16 MiB supported size.')
      const raw = parseBoundedJson(await file.text())
      let imported: ParsedLibraryMetadata
      if (typeof raw === 'object' && raw !== null && 'kind' in raw && raw.kind === 'void-library-metadata') imported = parseLibraryMetadataExport(raw)
      else {
        const annotations = parseAnnotationExport(raw)
        const ids = [...new Set(annotations.annotations.map((item) => item.mediaId.split('/')[0]!))]
        imported = { scope: ids.length === 1 ? 'library' : 'all', library: { id: ids.length === 1 ? decodeURIComponent(ids[0]!) : null, name: null }, annotations, favoriteTagIds: [], collections: [], playback: { recordsByMediaId: {} } }
      }
      const targetId = useLibraryStore.getState().libraryId
      if (imported.scope === 'library' && !targetId) throw new Error('Select the destination library before importing a library backup.')
      const mapped = mapAnnotationExportToLibrary(imported.annotations, imported.scope === 'library' ? targetId : null)
      const media = new Set(useMediaStore.getState().orderedIds)
      const existing = useAnnotationStore.getState().annotationsByMediaId
      const matched = mapped.annotations.filter((item) => media.has(item.mediaId)).length
      setPreview({ imported, targetId, matched, unmatched: mapped.annotations.length - matched, conflicts: mapped.annotations.filter((item) => existing[item.mediaId]).length })
      setMessage(null)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not read this backup.') }
  }
  const confirmImport = async () => {
    if (!preview || busy) return
    setBusy(true)
    try {
      if (useLibraryStore.getState().libraryId !== preview.targetId) throw new Error('The selected library changed. Preview the backup again.')
      const merged = mergeLibraryMetadata(current(), preview.imported)
      const annotations = { ...merged.annotations, favoriteTagIds: merged.favoriteTagIds }
      const collections = { collectionsById: merged.collectionsById, orderedCollectionIds: merged.orderedCollectionIds }
      await commitUserDataImport({
        'void-annotations-store': JSON.stringify({ state: annotations, version: 1 }),
        'void-collections-store': JSON.stringify({ state: collections, version: 2 }),
        'void-playback-store': JSON.stringify({ state: merged.playback, version: 1 }),
      }, () => { useAnnotationStore.setState(annotations); useCollectionStore.setState(collections); usePlaybackStore.setState(merged.playback) })
      setPreview(null)
      setMessage('Import committed to durable storage. A snapshot of the previous metadata was retained for recovery.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Import was not committed.') }
    finally { setBusy(false) }
  }
  return <div className="space-y-5 px-5 py-5">
    <p className="font-bold">Library metadata backup</p>
    <p className="text-sm text-on-secondary">Export the active library or all library IDs. Shared tag definitions and smart collections are included. Imports preview scope and matching before changing data.</p>
    {message && <p role="status">{message}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="button" className="border px-4 py-2" onClick={() => void exportAnnotations()}>Export library</button>
      <button type="button" className="border px-4 py-2" onClick={() => void exportAnnotations(true)}>Export all metadata</button>
      <button type="button" disabled={busy} className="bg-primary px-4 py-2" onClick={() => inputRef.current?.click()}>Preview import</button>
      <input ref={inputRef} type="file" accept="application/json,.json" onChange={(event) => void importAnnotations(event)} className="hidden" aria-label="Choose metadata backup" />
    </div>
    {preview && <section className="space-y-3 border border-primary/40 p-5" aria-label="Import preview">
      <p className="font-bold">{preview.imported.scope === 'all' ? 'All-library backup: original library IDs will be preserved.' : `Map source ${preview.imported.library.name ?? preview.imported.library.id} to the currently selected library.`}</p>
      <p>{preview.imported.annotations.tags.length} tags; {preview.imported.collections.length} collections; {Object.keys(preview.imported.playback.recordsByMediaId).length} playback records. Annotated videos: {preview.matched} matched, {preview.unmatched} unavailable here, {preview.conflicts} overlap existing annotations.</p>
      <p className="text-sm">Tags and favorites merge. Existing collection names are kept; playback uses saved progress and watched state. Unmatched records remain under the displayed scope. Source videos stay unchanged. A recovery snapshot is saved in the same transaction.</p>
      <div className="flex gap-3"><button type="button" disabled={busy} className="bg-primary px-4 py-2" onClick={() => void confirmImport()}>{busy ? 'Saving…' : 'Confirm merge'}</button><button type="button" disabled={busy} className="border px-4 py-2" onClick={() => setPreview(null)}>Cancel</button></div>
    </section>}
    <UserDataRecoveryPanel />
  </div>
}
