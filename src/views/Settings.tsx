import { useState, type ReactNode } from 'react'
import { Database, RotateCcw, Trash2 } from 'lucide-react'
import {
  useSettingsStore,
  type PreviewDelay,
  type SortOrder,
  type ThumbnailPriority,
  type TileDensity,
} from '../features/settings/store/settingsStore'
import { clearThumbnailCache } from '../features/explorer/services/thumbnailCache'
import { thumbnailQueue } from '../features/explorer/services/thumbnailQueue'
import { useMediaStore } from '../features/explorer/store/mediaStore'
import { usePlayerStore } from '../features/player/store/playerStore'
import { TagManager } from '../features/annotations/components/TagManager'
import { AnnotationTransferPanel } from '../features/annotations/components/AnnotationTransferPanel'

export default function Settings() {
  const settings = useSettingsStore()
  const [cacheMessage, setCacheMessage] = useState<string | null>(null)
  const [isClearingCache, setIsClearingCache] = useState(false)

  const clearCache = async () => {
    setIsClearingCache(true)
    thumbnailQueue.setPaused(true)
    await thumbnailQueue.waitForIdle()
    thumbnailQueue.clearPending()
    try {
      const removedCount = await clearThumbnailCache()
      const mediaState = useMediaStore.getState()
      for (const id of mediaState.orderedIds) {
        mediaState.updateAsset(id, {
          thumbnailBlobKey: undefined,
          thumbnailStatus: 'idle',
        })
      }
      setCacheMessage(
        removedCount === 1
          ? 'Removed 1 cached thumbnail.'
          : `Removed ${removedCount} cached thumbnails.`,
      )
    } catch (error) {
      setCacheMessage(
        error instanceof Error ? error.message : 'Could not clear the cache.',
      )
    } finally {
      const shouldRemainPaused =
        useSettingsStore.getState().thumbnailPriority === 'paused' ||
        useMediaStore.getState().activePreviewId !== null ||
        usePlayerStore.getState().selectedAssetId !== null
      thumbnailQueue.setPaused(shouldRemainPaused)
      setIsClearingCache(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-surface-dim px-10 py-12">
      <header className="mx-auto flex max-w-4xl items-end justify-between border-b border-white/6 pb-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-fixed-dim">
            Preferences
          </p>
          <h2 className="mt-3 text-4xl font-black">Settings</h2>
          <p className="mt-3 text-on-secondary">
            Persisted locally in this browser. No account required.
          </p>
        </div>
        <button
          type="button"
          onClick={settings.resetSettings}
          className="flex items-center gap-2 border border-white/8 px-4 py-2.5 text-sm font-bold text-on-secondary hover:text-white"
        >
          <RotateCcw size={16} /> Reset defaults
        </button>
      </header>

      <div className="mx-auto mt-8 max-w-4xl space-y-7">
        <SettingsGroup title="Playback" description="Preview behavior in Explorer.">
          <ToggleRow
            label="Autoplay hover previews"
            description="Play silent sampled snippets while a tile is hovered or focused."
            checked={settings.autoplayHoverPreview}
            onChange={(value) => settings.updateSetting('autoplayHoverPreview', value)}
          />
          <SelectRow
            label="Preview delay"
            description="Wait before allocating a video decoder for a tile."
            value={String(settings.previewDelayMs)}
            onChange={(value) =>
              settings.updateSetting('previewDelayMs', Number(value) as PreviewDelay)
            }
            options={[
              ['150', '150 ms'],
              ['250', '250 ms'],
              ['500', '500 ms'],
            ]}
          />
        </SettingsGroup>

        <SettingsGroup
          title="Library & cache"
          description="Control discovery and local thumbnail work."
        >
          <ToggleRow
            label="Scan subfolders"
            description="Include folders nested below the selected library root."
            checked={settings.scanSubfolders}
            onChange={(value) => settings.updateSetting('scanSubfolders', value)}
          />
          <SelectRow
            label="Thumbnail priority"
            description="Visible-first keeps the gallery useful while background work continues."
            value={settings.thumbnailPriority}
            onChange={(value) =>
              settings.updateSetting(
                'thumbnailPriority',
                value as ThumbnailPriority,
              )
            }
            options={[
              ['visible-first', 'Visible first'],
              ['balanced', 'Balanced'],
              ['paused', 'Paused'],
            ]}
          />
          <div className="flex items-center justify-between gap-8 px-5 py-5">
            <div>
              <p className="font-bold">Local thumbnail cache</p>
              <p className="mt-1 text-sm leading-6 text-on-secondary">
                Delete generated JPEG previews from IndexedDB. Original videos are untouched.
              </p>
              {cacheMessage && (
                <p className="mt-2 text-xs text-primary-fixed-dim">{cacheMessage}</p>
              )}
            </div>
            <button
              type="button"
              disabled={isClearingCache}
              onClick={() => void clearCache()}
              className="flex shrink-0 items-center gap-2 border border-red-300/15 px-4 py-2.5 text-sm font-bold text-red-200 disabled:opacity-50"
            >
              <Trash2 size={16} /> {isClearingCache ? 'Clearing…' : 'Clear Cache'}
            </button>
          </div>
        </SettingsGroup>

        <SettingsGroup
          title="Tags"
          description="Create reusable labels, choose curated colors, and review tag usage."
        >
          <TagManager />
          <AnnotationTransferPanel />
        </SettingsGroup>

        <SettingsGroup title="Interface" description="Gallery density and motion.">
          <ToggleRow
            label="Show filenames"
            description="Overlay filenames and file size on gallery tiles."
            checked={settings.showFilenames}
            onChange={(value) => settings.updateSetting('showFilenames', value)}
          />
          <ToggleRow
            label="Reduce motion"
            description="Disable nonessential transitions and animations."
            checked={settings.reduceMotion}
            onChange={(value) => settings.updateSetting('reduceMotion', value)}
          />
          <SelectRow
            label="Tile density"
            description="Choose the minimum width of media tiles."
            value={settings.tileDensity}
            onChange={(value) =>
              settings.updateSetting('tileDensity', value as TileDensity)
            }
            options={[
              ['compact', 'Compact'],
              ['comfortable', 'Comfortable'],
              ['large', 'Large'],
            ]}
          />
        </SettingsGroup>

        <SettingsGroup title="General" description="Startup and default ordering.">
          <ToggleRow
            label="Restore last library"
            description="Revalidate the saved folder handle when VOID starts."
            checked={settings.restoreLastLibrary}
            onChange={(value) => settings.updateSetting('restoreLastLibrary', value)}
          />
          <SelectRow
            label="Default sort order"
            description="Applied immediately to the Explorer queue."
            value={settings.defaultSortOrder}
            onChange={(value) =>
              settings.updateSetting('defaultSortOrder', value as SortOrder)
            }
            options={[
              ['modified-date', 'Recently modified'],
              ['name', 'Filename'],
              ['size', 'File size'],
            ]}
          />
          <div className="flex items-center gap-4 px-5 py-5 text-sm text-on-secondary">
            <Database size={18} className="text-primary-fixed-dim" />
            Settings, folder handles, and thumbnail blobs stay in browser storage.
          </div>
        </SettingsGroup>
      </div>
    </div>
  )
}

function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden border border-white/7 bg-surface-container">
      <header className="border-b border-white/6 px-6 py-5">
        <h3 className="text-lg font-black">{title}</h3>
        <p className="mt-1 text-sm text-on-secondary">{description}</p>
      </header>
      <div className="divide-y divide-white/5">{children}</div>
    </section>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-8 px-5 py-5">
      <span>
        <span className="block font-bold">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-on-secondary">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 accent-primary"
      />
    </label>
  )
}

function SelectRow({
  label,
  description,
  value,
  onChange,
  options,
}: {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
  options: [value: string, label: string][]
}) {
  return (
    <label className="flex items-center justify-between gap-8 px-5 py-5">
      <span>
        <span className="block font-bold">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-on-secondary">
          {description}
        </span>
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="themed-select min-w-40 shrink-0 border border-white/8 px-3 py-2.5 text-sm outline-none"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}
