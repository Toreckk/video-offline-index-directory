export type MediaFileSource =
  | {
      kind: 'file-system-handle'
      handle: FileSystemFileHandle
    }
  | {
      kind: 'session-file'
      file: File
    }

export type PersistentLibraryScanSource = {
  kind: 'directory-handle'
  libraryId: string
  rootName: string
  directoryHandle: FileSystemDirectoryHandle
}

export type SessionLibraryScanSource = {
  kind: 'session-files'
  libraryId: string
  rootName: string
  files: readonly File[]
}

export type LibraryScanSource =
  | PersistentLibraryScanSource
  | SessionLibraryScanSource

export function createHandleMediaSource(
  handle: FileSystemFileHandle,
): MediaFileSource {
  return { kind: 'file-system-handle', handle }
}

export function createSessionMediaSource(file: File): MediaFileSource {
  return { kind: 'session-file', file }
}

export function openMediaFile(source: MediaFileSource): Promise<File> {
  return source.kind === 'file-system-handle'
    ? source.handle.getFile()
    : Promise.resolve(source.file)
}
