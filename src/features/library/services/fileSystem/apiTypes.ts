import type { SupportedVideoExtension } from './videoExtensions'

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
}

export type VideoFileRecord = {
  name: string
  extension: SupportedVideoExtension
  pathParts: string[]
  fileHandle: FileSystemFileHandle
  size: number
  lastModified: number
}
