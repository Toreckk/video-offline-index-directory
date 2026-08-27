import type { VoidPlatform } from '@void/core'

export function createWebPlatform(): VoidPlatform {
  return {
    kind: 'web',
    capabilities: {
      persistentLibraryAccess:
        typeof window !== 'undefined' && 'showDirectoryPicker' in window,
      nativeCatalog: false,
      diskThumbnailCache: false,
      revealInFileManager: false,
      fullFileHashing: false,
      nativeMediaProbe: false,
      recycleBinCleanup: false,
    },
  }
}
