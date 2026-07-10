import {
  Check,
  Circle,
  FolderOpen,
  LoaderCircle,
  OctagonX,
  RotateCcw,
} from 'lucide-react'
import { useState } from 'react'
import { useAppNavigation } from '../app/navigationContext'
import { VIEW_IDS } from '../app/views'
import { useLibraryRoute } from '../features/library/components/libraryRouteContext'
import { useLibraryStore } from '../features/library/store/libraryStore'
import { useSettingsStore } from '../features/settings/store/settingsStore'
import { LibraryHealth } from '../features/library/components/LibraryHealth'

export default function Folders() {
  const [section, setSection] = useState<'source' | 'health'>('source')
  const { navigate } = useAppNavigation()
  const {
    openRouteDialog,
    startCurrentLibraryScan,
    reconnectAndScan,
    cancelScan,
  } = useLibraryRoute()
  const directoryName = useLibraryStore((state) => state.directoryName)
  const permissionStatus = useLibraryStore((state) => state.permissionStatus)
  const sourceKind = useLibraryStore((state) => state.sourceKind)
  const scanStatus = useLibraryStore((state) => state.scanStatus)
  const scanPhase = useLibraryStore((state) => state.scanPhase)
  const scanProgress = useLibraryStore((state) => state.scanProgress)
  const scanError = useLibraryStore((state) => state.scanError)
  const recentDirectories = useLibraryStore((state) => state.recentDirectories)
  const setIsBackgroundScanning = useLibraryStore(
    (state) => state.setIsBackgroundScanning,
  )
  const scanSubfolders = useSettingsStore((state) => state.scanSubfolders)
  const updateSetting = useSettingsStore((state) => state.updateSetting)

  const isDiscovering = scanStatus === 'scanning'
  const thumbnailPercent = scanProgress.thumbnailTotal
    ? Math.round(
        (scanProgress.thumbnailsGenerated / scanProgress.thumbnailTotal) * 100,
      )
    : 0

  return (
    <div className="min-h-screen w-full bg-surface-dim px-10 py-12">
      <header className="mx-auto flex max-w-5xl items-end justify-between gap-6 border-b border-white/6 pb-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-fixed-dim">
            Library & routes
          </p>
          <h2 className="mt-3 text-4xl font-black">Library</h2>
          <p className="mt-3 text-on-secondary">
            Select, reconnect, and monitor your browser-indexed media roots.
          </p>
        </div>
        {section === 'source' && <button
          type="button"
          onClick={openRouteDialog}
          className="flex items-center gap-3 bg-primary px-5 py-3 text-sm font-black"
        >
          <FolderOpen size={19} />
          {directoryName ? 'Choose Another Folder' : 'Browse Local'}
        </button>}
      </header>

      <div className="mx-auto mt-6 flex max-w-5xl gap-2" role="tablist" aria-label="Library sections">
        {(['source', 'health'] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={section === value} onClick={() => setSection(value)} className={`px-4 py-2.5 text-sm font-black capitalize ${section === value ? 'bg-primary text-white' : 'border border-white/8 text-on-secondary hover:text-white'}`}>{value}</button>)}
      </div>

      {section === 'health' ? <LibraryHealth /> : <div className="mx-auto mt-8 grid max-w-5xl gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="border border-white/7 bg-surface-container p-7">
          {!directoryName ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <FolderOpen size={42} className="text-primary-fixed-dim" />
              <h3 className="mt-5 text-xl font-black">No library configured</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-on-secondary">
                Choose a local folder. VOID will discover .mp4 and .webm files
                without uploading them.
              </p>
              <button
                type="button"
                onClick={openRouteDialog}
                className="mt-6 bg-primary px-5 py-3 text-sm font-black"
              >
                Configure Library Route
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-on-secondary">
                    Current route
                  </p>
                  <h3 className="mt-2 text-2xl font-black">{directoryName}</h3>
                  <p className="mt-2 text-sm text-on-secondary">
                    {sourceKind === 'session-files'
                      ? 'Session folder access'
                      : 'Persistent read-only access'}{' '}
                    · {scanSubfolders ? 'including' : 'excluding'} subfolders
                  </p>
                </div>
                <span
                  className={`border px-3 py-1 text-xs font-black uppercase tracking-wider ${
                    permissionStatus === 'granted'
                      ? 'border-emerald-300/20 text-emerald-200'
                      : 'border-amber-300/20 text-amber-200'
                  }`}
                >
                  {permissionStatus === 'granted' ? 'Connected' : 'Reconnect needed'}
                </span>
              </div>

              {permissionStatus !== 'granted' ? (
                <div className="mt-8 border border-amber-300/15 bg-amber-400/5 p-5">
                  <p className="font-bold">Browser permission is missing.</p>
                  <p className="mt-2 text-sm leading-6 text-on-secondary">
                    Reconnect through a button click so the browser can safely show
                    its permission prompt.
                  </p>
                  <button
                    type="button"
                    onClick={() => void reconnectAndScan()}
                    className="mt-5 bg-amber-200 px-4 py-2.5 text-sm font-black text-black"
                  >
                    Reconnect Library
                  </button>
                </div>
              ) : (
                <div className="mt-8 space-y-3">
                  <ProgressRow
                    label="Folders scanned"
                    value={scanProgress.foldersScanned}
                    active={isDiscovering}
                    complete={scanPhase !== 'discovering' && scanPhase !== 'idle'}
                  />
                  <ProgressRow
                    label="Videos found"
                    value={scanProgress.videosFound}
                    active={isDiscovering}
                    complete={scanStatus === 'ready'}
                  />
                  <ProgressRow
                    label="Thumbnails generated"
                    value={
                      scanProgress.thumbnailTotal
                        ? `${scanProgress.thumbnailsGenerated}/${scanProgress.thumbnailTotal} (${thumbnailPercent}%)`
                        : 'Waiting for discovery'
                    }
                    active={scanPhase === 'thumbnails'}
                    complete={scanPhase === 'complete' && scanStatus === 'ready'}
                  />
                </div>
              )}

              {scanError && (
                <div className="mt-6 border border-red-300/15 bg-red-500/5 p-4 text-sm text-red-200">
                  {scanError}
                </div>
              )}

              {permissionStatus === 'granted' && (
                <div className="mt-8 flex flex-wrap gap-3 border-t border-white/6 pt-6">
                  {isDiscovering ? (
                    <>
                      <button
                        type="button"
                        onClick={cancelScan}
                        className="flex items-center gap-2 border border-red-300/15 px-4 py-2.5 text-sm font-bold text-red-200"
                      >
                        <OctagonX size={17} /> Abort Scan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsBackgroundScanning(true)
                          navigate(VIEW_IDS.explorer)
                        }}
                        className="border border-white/10 px-4 py-2.5 text-sm font-bold"
                      >
                        Run in Background
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void startCurrentLibraryScan()}
                      className="flex items-center gap-2 border border-white/10 px-4 py-2.5 text-sm font-bold"
                    >
                      <RotateCcw size={17} /> Rescan Library
                    </button>
                  )}
                  {scanProgress.videosFound > 0 && (
                    <button
                      type="button"
                      onClick={() => navigate(VIEW_IDS.explorer)}
                      className="bg-primary px-4 py-2.5 text-sm font-black"
                    >
                      Open Explorer
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <aside className="space-y-6">
          <section className="border border-white/7 bg-surface-container p-6">
            <h3 className="font-black">Scan options</h3>
            <label className="mt-5 flex cursor-pointer items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-bold">Scan subfolders</span>
                <span className="mt-1 block text-xs text-on-secondary">
                  Applied on the next scan.
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
          </section>

          <section className="border border-white/7 bg-surface-container p-6">
            <h3 className="font-black">Recent paths</h3>
            {recentDirectories.length === 0 ? (
              <p className="mt-4 text-sm text-on-secondary">No recent folders yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {recentDirectories.map((directory) => (
                  <li
                    key={directory.libraryId}
                    className="border border-white/5 bg-black/15 px-4 py-3 text-sm"
                  >
                    {directory.name}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>}
    </div>
  )
}

function ProgressRow({
  label,
  value,
  active,
  complete,
}: {
  label: string
  value: string | number
  active: boolean
  complete: boolean
}) {
  return (
    <div className="flex items-center gap-4 border border-white/5 bg-black/15 px-4 py-3">
      {complete ? (
        <Check size={19} className="text-emerald-300" />
      ) : active ? (
        <LoaderCircle size={19} className="animate-spin text-primary-fixed-dim" />
      ) : (
        <Circle size={19} className="text-on-secondary/30" />
      )}
      <span className="flex-1 text-sm font-bold">{label}</span>
      <span className="text-sm tabular-nums text-on-secondary">{value}</span>
    </div>
  )
}
