import { FolderOpen, Info, X } from 'lucide-react'
import { useSettingsStore } from '../../settings/store/settingsStore'

type LibraryRouteDialogProps = {
  isBusy: boolean
  error: string | null
  hasPersistentDirectoryAccess: boolean
  onClose: () => void
  onPickDirectory: () => void
}

const FORMATS = [
  { label: '.mp4', enabled: true },
  { label: '.webm', enabled: true },
  { label: '.mov', enabled: false },
  { label: '.mkv', enabled: false },
  { label: '.r3d', enabled: false },
]

export function LibraryRouteDialog({
  isBusy,
  error,
  hasPersistentDirectoryAccess,
  onClose,
  onPickDirectory,
}: LibraryRouteDialogProps) {
  const scanSubfolders = useSettingsStore((state) => state.scanSubfolders)
  const updateSetting = useSettingsStore((state) => state.updateSetting)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-route-title"
    >
      <section className="w-full max-w-[620px] border border-white/10 bg-surface-container p-8 shadow-2xl">
        <header className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-fixed-dim">
              Local-first indexing
            </p>
            <h2 id="library-route-title" className="mt-3 text-3xl font-black">
              Choose a folder to index
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-on-secondary transition hover:bg-white/5 hover:text-white"
            aria-label="Close folder setup"
          >
            <X size={22} />
          </button>
        </header>

        <p className="mt-5 max-w-[520px] leading-7 text-on-secondary">
          VOID reads video metadata and thumbnails in your browser. Files stay on
          this device and are never uploaded.
        </p>

        {!hasPersistentDirectoryAccess && (
          <div className="mt-5 flex gap-3 border border-sky-300/15 bg-sky-400/5 p-4 text-sm leading-6 text-sky-100">
            <Info className="mt-0.5 shrink-0" size={18} />
            <span>
              This browser supports session folder access. VOID will remember
              metadata and settings, but you will reconnect the folder after a
              browser restart.
            </span>
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-2">
          {FORMATS.map((format) => (
            <span
              key={format.label}
              className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                format.enabled
                  ? 'border-primary/50 bg-primary/10 text-primary-fixed-dim'
                  : 'border-white/5 bg-black/20 text-on-secondary/40'
              }`}
            >
              {format.label}
              {!format.enabled && ' · soon'}
            </span>
          ))}
        </div>

        <label className="mt-7 flex cursor-pointer items-center justify-between border border-white/7 bg-black/20 p-4">
          <span>
            <span className="block font-bold">Scan subfolders</span>
            <span className="mt-1 block text-sm text-on-secondary">
              Include videos nested below the selected folder.
            </span>
          </span>
          <input
            type="checkbox"
            checked={scanSubfolders}
            onChange={(event) =>
              updateSetting('scanSubfolders', event.target.checked)
            }
            className="h-5 w-5 accent-primary"
          />
        </label>

        {error && (
          <div className="mt-5 flex gap-3 border border-red-400/20 bg-red-500/8 p-4 text-sm text-red-200">
            <Info className="shrink-0" size={18} />
            <span>{error}</span>
          </div>
        )}

        <footer className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border border-white/8 px-5 py-3 text-sm font-bold text-on-secondary transition hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onPickDirectory}
            className="flex items-center gap-3 bg-primary px-6 py-3 text-sm font-black text-white transition hover:bg-primary-fixed-dim disabled:cursor-wait disabled:opacity-60"
          >
            <FolderOpen size={19} />
            {isBusy ? 'Opening picker…' : 'Open Folder Picker'}
          </button>
        </footer>
      </section>
    </div>
  )
}
