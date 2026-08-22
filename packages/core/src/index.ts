export type PlatformKind = 'web' | 'desktop'

export type PlatformCapabilities = {
  persistentLibraryAccess: boolean
  nativeCatalog: boolean
  diskThumbnailCache: boolean
  revealInFileManager: boolean
  fullFileHashing: boolean
}

export type NativeLibrarySelection = {
  rootName: string
  rootPath: string
}

export type NativeMediaFile = {
  name: string
  extension: string
  pathParts: string[]
  absolutePath: string
  size: number
  lastModified: number
}

export type NativeCatalogAsset = NativeMediaFile & {
  id: string
  libraryId: string
  rootName: string
  thumbnailStatus: 'idle' | 'queued' | 'ready' | 'error'
  thumbnailBlobKey?: string
  duration?: number
  width?: number
  height?: number
}

export type NativeCatalog = {
  version: 1
  libraryId: string
  rootPath: string
  savedAt: number
  assets: NativeCatalogAsset[]
}

export type NativeScanOptions = {
  rootPath: string
  scanSubfolders: boolean
}

export type VoidPlatform = {
  kind: PlatformKind
  capabilities: PlatformCapabilities
  selectLibrary?: () => Promise<NativeLibrarySelection | null>
  scanLibrary?: (options: NativeScanOptions) => Promise<NativeMediaFile[]>
  loadCatalog?: (libraryId: string) => Promise<NativeCatalog | null>
  saveCatalog?: (catalog: NativeCatalog) => Promise<void>
  deleteCatalog?: (libraryId: string) => Promise<void>
  readThumbnail?: (key: string) => Promise<Uint8Array | null>
  writeThumbnail?: (key: string, bytes: Uint8Array) => Promise<void>
  clearThumbnailCache?: () => Promise<number>
  createMediaUrl?: (absolutePath: string) => string
  revealFile?: (absolutePath: string) => Promise<void>
  hashFile?: (absolutePath: string) => Promise<string>
}

const WEB_CAPABILITIES: PlatformCapabilities = {
  persistentLibraryAccess: true,
  nativeCatalog: false,
  diskThumbnailCache: false,
  revealInFileManager: false,
  fullFileHashing: false,
}

let activePlatform: VoidPlatform = {
  kind: 'web',
  capabilities: WEB_CAPABILITIES,
}

export function installVoidPlatform(platform: VoidPlatform) {
  activePlatform = platform
}

export function getVoidPlatform() {
  return activePlatform
}
