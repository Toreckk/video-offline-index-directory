import { useRef, useState, type ChangeEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { useAnnotationStore } from '../store/annotationStore'
import { createAnnotationExport, mergeAnnotationExport, parseAnnotationExport } from '../services/annotationTransfer'
import { formatBytes } from '../../../utils/media'

export function AnnotationTransferPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const exportAnnotations = () => {
    const state = useAnnotationStore.getState()
    const data = createAnnotationExport(state)
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `void-annotations-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage(`Exported ${data.t.length} tags and ${data.a.length} annotated videos in ${formatBytes(blob.size)}.`)
  }

  const importAnnotations = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const imported = parseAnnotationExport(JSON.parse(await file.text()) as unknown)
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
        <p className="font-bold">Annotation backup</p>
        <p className="mt-1 text-sm leading-6 text-on-secondary">Export or merge favorites and tags as JSON. Media identifiers include library-relative paths, so treat the backup as private metadata.</p>
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
