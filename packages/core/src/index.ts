export type PlatformKind = 'web' | 'desktop'

export type UserDataSnapshot = {
  schemaVersion: 1
  revision: number
  records: Record<string, string>
  migration: { id: string; origin: string; createdAt: number } | null
}

export type UserDataCommit = {
  expectedRevision: number
  records: Record<string, string>
  migration?: NonNullable<UserDataSnapshot['migration']>
  recoveryReason?: 'import'
  catalog?: NativeCatalog
}

export type UserDataPort = {
  raw?: () => Promise<string | null>
  load: () => Promise<UserDataSnapshot | null>
  commit: (request: UserDataCommit) => Promise<UserDataSnapshot>
  recovery: () => Promise<Array<{ reason: string; snapshot: UserDataSnapshot }>>
}

export type PlatformCapabilities = {
  persistentLibraryAccess: boolean
  nativeCatalog: boolean
  diskThumbnailCache: boolean
  revealInFileManager: boolean
  fullFileHashing: boolean
  nativeMediaProbe: boolean
  recycleBinCleanup: boolean
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

export type NativeDuplicateCleanupFile = {
  absolutePath: string
  expectedSha256: string
}

export type NativeDuplicateCleanupRequest = {
  keeper: NativeDuplicateCleanupFile
  redundantFiles: NativeDuplicateCleanupFile[]
}

export type NativeDuplicateCleanupIssue = {
  absolutePath: string
  message: string
}

export type NativeDuplicateCleanupResult = {
  keptPath: string
  movedPaths: string[]
  skipped: NativeDuplicateCleanupIssue[]
  failed: NativeDuplicateCleanupIssue[]
}

export type NativeLibrarySelection = {
  rootName: string
  rootPath: string
}

export type NativeMediaFile = {
  fileIdentity?: string
  name: string
  extension: string
  pathParts: string[]
  absolutePath: string
  size: number
  lastModified: number
}

export type NativeCatalogAsset = NativeMediaFile & {
  availability?: 'available' | 'unavailable'
  id: string
  libraryId: string
  rootName: string
  thumbnailStatus: 'idle' | 'queued' | 'ready' | 'error'
  thumbnailBlobKey?: string
  duration?: number
  width?: number
  height?: number
  videoCodec?: string
  audioCodec?: string
  mediaProbeStatus?: 'ready' | 'error'
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

export type NativeScanResult = {
  files: NativeMediaFile[]
  complete: boolean
  diagnostics: Array<{ path: string; message: string }>
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
  userData?: UserDataPort
  kind: PlatformKind
  capabilities: PlatformCapabilities
  selectLibrary?: () => Promise<NativeLibrarySelection | null>
  restoreLibrary?: (
    libraryId: string,
    rootPath: string,
  ) => Promise<NativeLibrarySelection>
  scanLibrary?: (options: NativeScanOptions) => Promise<NativeScanResult>
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
  probeMedia?: (absolutePath: string, signal?: AbortSignal) => Promise<NativeMediaMetadata>
  cleanupDuplicateFiles?: (
    request: NativeDuplicateCleanupRequest,
  ) => Promise<NativeDuplicateCleanupResult>
}

const WEB_CAPABILITIES: PlatformCapabilities = {
  persistentLibraryAccess: true,
  nativeCatalog: false,
  diskThumbnailCache: false,
  revealInFileManager: false,
  fullFileHashing: false,
  nativeMediaProbe: false,
  recycleBinCleanup: false,
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
