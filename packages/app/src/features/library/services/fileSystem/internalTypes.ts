export type FileSystemEntryHandle =
  | FileSystemDirectoryHandle
  | FileSystemFileHandle

export type IterableFileSystemDirectoryHandle = FileSystemDirectoryHandle & {
  entries(): AsyncIterable<[string, FileSystemEntryHandle]>
}

export type NormalizedWalkDirectoryOptions = {
  scanSubfolders: boolean
  signal?: AbortSignal
  onDirectoryVisited?: (pathParts: readonly string[]) => void
  onError?: (details: { pathParts: readonly string[]; error: unknown }) => void
}
