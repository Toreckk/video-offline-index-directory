import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import type {
  NativeCatalog,
  NativeLibrarySelection,
  NativeMediaFile,
  VoidPlatform,
} from '@void/core'

export function createDesktopPlatform(): VoidPlatform {
  return {
    kind: 'desktop',
    capabilities: {
      persistentLibraryAccess: true,
      nativeCatalog: true,
      diskThumbnailCache: true,
      revealInFileManager: true,
      fullFileHashing: true,
    },
    selectLibrary: () =>
      invoke<NativeLibrarySelection | null>('select_library'),
    scanLibrary: (options) =>
      invoke<NativeMediaFile[]>('scan_library', { options }),
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
  }
}
