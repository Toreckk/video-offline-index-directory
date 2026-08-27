import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type {
  NativeCatalog,
  NativeLibraryWatchEvent,
  NativeLibrarySelection,
  NativeMediaMetadata,
  NativeMediaFile,
  NativeMediaProbeStatus,
  NativeDuplicateCleanupRequest,
  NativeDuplicateCleanupResult,
  VoidPlatform,
} from '@void/core'

export type DesktopWindowController = {
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  minimize: () => Promise<void>
  onResized: (listener: () => void) => Promise<() => void>
  setDecorations: (decorated: boolean) => Promise<void>
  toggleMaximize: () => Promise<void>
}

export function createDesktopWindowController(): DesktopWindowController {
  const appWindow = getCurrentWindow()

  return {
    close: () => appWindow.close(),
    isMaximized: () => appWindow.isMaximized(),
    minimize: () => appWindow.minimize(),
    onResized: (listener) => appWindow.onResized(listener),
    setDecorations: (decorated) => appWindow.setDecorations(decorated),
    toggleMaximize: () => appWindow.toggleMaximize(),
  }
}

export function createDesktopPlatform(): VoidPlatform {
  return {
    kind: 'desktop',
    capabilities: {
      persistentLibraryAccess: true,
      nativeCatalog: true,
      diskThumbnailCache: true,
      revealInFileManager: true,
      fullFileHashing: true,
      nativeMediaProbe: true,
      recycleBinCleanup: true,
    },
    selectLibrary: () =>
      invoke<NativeLibrarySelection | null>('select_library'),
    restoreLibrary: (libraryId, rootPath) =>
      invoke<NativeLibrarySelection>('restore_library', { libraryId, rootPath }),
    scanLibrary: (options) =>
      invoke<NativeMediaFile[]>('scan_library', { options }),
    watchLibrary: async (options, onEvent) => {
      let watchId: string | null = null
      const unlisten = await listen<NativeLibraryWatchEvent>(
        'void://library-watch',
        ({ payload }) => {
          if (payload.watchId === watchId) onEvent(payload)
        },
      )
      try {
        watchId = await invoke<string>('start_library_watch', { options })
      } catch (error) {
        unlisten()
        throw error
      }
      return {
        stop: async () => {
          unlisten()
          if (watchId) {
            await invoke<void>('stop_library_watch', { watchId })
            watchId = null
          }
        },
      }
    },
    loadCatalog: (libraryId) =>
      invoke<NativeCatalog | null>('load_catalog', { libraryId }),
    saveCatalog: (catalog) => invoke<void>('save_catalog', { catalogValue: catalog }),
    deleteCatalog: (libraryId) => invoke<void>('delete_catalog', { libraryId }),
    readThumbnail: async (key) => {
      const bytes = await invoke<number[] | null>('read_thumbnail', { key })
      return bytes ? new Uint8Array(bytes) : null
    },
    writeThumbnail: (key, bytes) =>
      invoke<void>('write_thumbnail', { key, bytes: Array.from(bytes) }),
    clearThumbnailCache: () => invoke<number>('clear_thumbnail_cache'),
    createMediaUrl: (absolutePath) => convertFileSrc(absolutePath),
    revealFile: (absolutePath) => invoke<void>('reveal_file', { absolutePath }),
    hashFile: (absolutePath) => invoke<string>('hash_file', { absolutePath }),
    getMediaProbeStatus: () =>
      invoke<NativeMediaProbeStatus>('media_probe_status'),
    probeMedia: (absolutePath) =>
      invoke<NativeMediaMetadata>('probe_media', { absolutePath }),
    cleanupDuplicateFiles: (request: NativeDuplicateCleanupRequest) =>
      invoke<NativeDuplicateCleanupResult>('cleanup_duplicate_files', { request }),
  }
}
