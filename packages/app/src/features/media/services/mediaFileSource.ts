import { getVoidPlatform, type NativeMediaFile } from '@void/core'

export type MediaFileSource =
  | {
      kind: 'file-system-handle'
      handle: FileSystemFileHandle
    }
  | {
      kind: 'session-file'
      file: File
    }
  | {
      kind: 'desktop-path'
      absolutePath: string
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

export type NativeLibraryScanSource = {
  kind: 'native-directory'
  libraryId: string
  rootName: string
  rootPath: string
}

export type LibraryScanSource =
  | PersistentLibraryScanSource
  | SessionLibraryScanSource
  | NativeLibraryScanSource

export function createHandleMediaSource(
  handle: FileSystemFileHandle,
): MediaFileSource {
  return { kind: 'file-system-handle', handle }
}

export function createSessionMediaSource(file: File): MediaFileSource {
  return { kind: 'session-file', file }
}

export function createDesktopMediaSource(absolutePath: string): MediaFileSource {
  return { kind: 'desktop-path', absolutePath }
}

export function openMediaFile(source: MediaFileSource): Promise<File> {
  if (source.kind === 'desktop-path') {
    return Promise.reject(new Error('Desktop media is streamed through the native asset protocol.'))
  }
  return source.kind === 'file-system-handle'
    ? source.handle.getFile()
    : Promise.resolve(source.file)
}

export async function createMediaUrl(source: MediaFileSource) {
  if (source.kind === 'desktop-path') {
    const createUrl = getVoidPlatform().createMediaUrl
    if (!createUrl) throw new Error('Native media URLs are unavailable.')
    return { url: createUrl(source.absolutePath), revoke: () => undefined }
  }

  const file = await openMediaFile(source)
  const url = URL.createObjectURL(file)
  return { url, revoke: () => URL.revokeObjectURL(url) }
}

export function nativeMediaFileToSource(file: NativeMediaFile): MediaFileSource {
  return createDesktopMediaSource(file.absolutePath)
}

export function getLibraryRelativeMediaPath(pathParts: readonly string[], name: string) {
  return [...pathParts, name].join('\\')
}
