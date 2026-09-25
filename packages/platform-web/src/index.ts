import type { VoidPlatform } from '@void/core'
import { createBrowserUserDataPort } from './userData'

export function createWebPlatform(): VoidPlatform {
  return {
    kind: 'web',
    userData: createBrowserUserDataPort(),
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
