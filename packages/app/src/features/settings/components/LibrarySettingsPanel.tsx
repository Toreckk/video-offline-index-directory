import { useState } from 'react'
import { Database, HardDrive, Trash2 } from 'lucide-react'
import { getVoidPlatform } from '@void/core'
import { useSettingsStore, type ThumbnailPriority } from '../store/settingsStore'
import { clearThumbnailCache } from '../../media/services/thumbnailCache'
import { thumbnailQueue } from '../../media/services/thumbnailQueue'
import { useMediaStore } from '../../media/store/mediaStore'
import { usePlayerStore } from '../../player/store/playerStore'
import { SelectRow, SettingsGroup, ToggleRow } from './SettingsPrimitives'

export function LibrarySettingsPanel() {
  const platform = getVoidPlatform()
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
      for (const id of mediaState.orderedIds) mediaState.updateAsset(id, { thumbnailBlobKey: undefined, thumbnailStatus: 'idle' })
      setCacheMessage(removedCount === 1 ? 'Removed 1 cached thumbnail.' : `Removed ${removedCount} cached thumbnails.`)
    } catch (error) {
      setCacheMessage(error instanceof Error ? error.message : 'Could not clear the cache.')
    } finally {
      const shouldRemainPaused = useSettingsStore.getState().thumbnailPriority === 'paused' || useMediaStore.getState().activePreviewId !== null || usePlayerStore.getState().selectedAssetId !== null
      thumbnailQueue.setPaused(shouldRemainPaused)
      setIsClearingCache(false)
    }
  }

  return <SettingsGroup title="Library & cache" description="Control discovery and local thumbnail work.">
    <div className="grid gap-px bg-white/7 sm:grid-cols-2">
      <div className="bg-surface-container-high px-5 py-4"><p className="flex items-center gap-2 text-sm font-black"><HardDrive size={16} className="text-primary-fixed-dim" />{platform.kind === 'desktop' ? 'Windows desktop runtime' : 'Web runtime'}</p><p className="mt-1 text-xs leading-5 text-on-secondary">{platform.kind === 'desktop' ? 'Native recursive scanning and reveal-in-Explorer are available.' : 'Folder access follows this browser’s filesystem capabilities.'}</p></div>
      <div className="bg-surface-container-high px-5 py-4"><p className="flex items-center gap-2 text-sm font-black"><Database size={16} className="text-primary-fixed-dim" />{platform.capabilities.nativeCatalog ? 'SQLite + disk cache' : 'IndexedDB cache'}</p><p className="mt-1 text-xs leading-5 text-on-secondary">Catalog and previews stay local to this device.</p></div>
    </div>
    <ToggleRow label="Scan subfolders" description="Include folders nested below the selected library root." checked={settings.scanSubfolders} onChange={(value) => settings.updateSetting('scanSubfolders', value)} />
    <SelectRow label="Thumbnail priority" description="Visible-first keeps the gallery useful while background work continues." value={settings.thumbnailPriority} onChange={(value) => settings.updateSetting('thumbnailPriority', value as ThumbnailPriority)} options={[["visible-first", "Visible first"], ["balanced", "Balanced"], ["paused", "Paused"]]} />
    <SelectRow label="Library ready notification" description="Automatically dismiss the ready message. Choose Never to keep the current manual behavior." value={String(settings.libraryReadyNotificationSeconds)} onChange={(value) => settings.updateSetting('libraryReadyNotificationSeconds', Number(value))} options={[["5", "5 seconds"], ["10", "10 seconds"], ["15", "15 seconds"], ["30", "30 seconds"], ["0", "Never"]]} />
    <div className="flex items-center justify-between gap-8 px-5 py-5">
      <div><p className="font-bold">Local thumbnail cache</p><p className="mt-1 text-sm leading-6 text-on-secondary">Delete generated JPEG previews from {platform.capabilities.diskThumbnailCache ? 'the desktop disk cache' : 'IndexedDB'}. Original videos are untouched.</p>{cacheMessage && <p className="mt-2 text-xs text-primary-fixed-dim">{cacheMessage}</p>}</div>
      <button type="button" disabled={isClearingCache} onClick={() => void clearCache()} className="flex shrink-0 items-center gap-2 border border-red-300/15 px-4 py-2.5 text-sm font-bold text-red-200 disabled:opacity-50"><Trash2 size={16} />{isClearingCache ? 'Clearing...' : 'Clear Cache'}</button>
    </div>
  </SettingsGroup>
}
