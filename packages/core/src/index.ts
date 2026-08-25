export type PlatformKind = 'web' | 'desktop'

export type PlatformCapabilities = {
  persistentLibraryAccess: boolean
  nativeCatalog: boolean
  diskThumbnailCache: boolean
  revealInFileManager: boolean
  fullFileHashing: boolean
  nativeMediaProbe: boolean
}

export type NativeMediaProbeStatus = {
  available: boolean
  provider: 'ffprobe'
  detail?: string
}

export type NativeMediaMetadata = {
  duration?: number
  width?: number
  height?: number
  videoCodec?: string
  audioCodec?: string
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

export type NativeLibraryWatchOptions = NativeScanOptions

export type NativeLibraryRename = {
  fromPath: string
  toPath: string
}

export type NativeLibraryWatchEvent = {
  watchId: string
  kind: 'changed' | 'error'
  paths: string[]
  renames: NativeLibraryRename[]
  message?: string
}

export type NativeLibraryWatchSubscription = {
  stop: () => Promise<void>
}

export type VoidPlatform = {
  kind: PlatformKind
  capabilities: PlatformCapabilities
  selectLibrary?: () => Promise<NativeLibrarySelection | null>
  restoreLibrary?: (
    libraryId: string,
    rootPath: string,
  ) => Promise<NativeLibrarySelection>
  scanLibrary?: (options: NativeScanOptions) => Promise<NativeMediaFile[]>
  watchLibrary?: (
    options: NativeLibraryWatchOptions,
    onEvent: (event: NativeLibraryWatchEvent) => void,
  ) => Promise<NativeLibraryWatchSubscription>
  loadCatalog?: (libraryId: string) => Promise<NativeCatalog | null>
  saveCatalog?: (catalog: NativeCatalog) => Promise<void>
  deleteCatalog?: (libraryId: string) => Promise<void>
  readThumbnail?: (key: string) => Promise<Uint8Array | null>
  writeThumbnail?: (key: string, bytes: Uint8Array) => Promise<void>
  clearThumbnailCache?: () => Promise<number>
  createMediaUrl?: (absolutePath: string) => string
  revealFile?: (absolutePath: string) => Promise<void>
  hashFile?: (absolutePath: string) => Promise<string>
  getMediaProbeStatus?: () => Promise<NativeMediaProbeStatus>
  probeMedia?: (absolutePath: string) => Promise<NativeMediaMetadata>
}

const WEB_CAPABILITIES: PlatformCapabilities = {
  persistentLibraryAccess: true,
  nativeCatalog: false,
  diskThumbnailCache: false,
  revealInFileManager: false,
  fullFileHashing: false,
  nativeMediaProbe: false,
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
