import type { SupportedVideoExtension } from './videoExtensions'
import type { MediaFileSource } from '../mediaFileSource'

export type FileSystemPermissionMode = 'read' | 'readwrite'

export type WellKnownDirectory =
  | 'desktop'
  | 'documents'
  | 'downloads'
  | 'music'
  | 'pictures'
  | 'videos'

export type DirectoryPickerOptions = {
  id?: string
  startIn?: FileSystemDirectoryHandle | WellKnownDirectory
}

export type BrowserDirectoryPickerOptions = DirectoryPickerOptions & {
  mode: 'read'
}

export type DirectoryPermissionOptions = {
  mode?: FileSystemPermissionMode
}

export type WalkDirectoryOptions = {
  scanSubfolders?: boolean
  signal?: AbortSignal
  onDirectoryVisited?: (pathParts: readonly string[]) => void
  onError?: (details: { pathParts: readonly string[]; error: unknown }) => void
}

export type DiscoveredVideoFile = {
  name: string
  extension: SupportedVideoExtension
  pathParts: string[]
  source: MediaFileSource
}

export type VideoFileMetadata = {
  size: number
  lastModified: number
}

export type VideoFileRecord = DiscoveredVideoFile & VideoFileMetadata
