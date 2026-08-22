export type FileSystemAccessErrorCode =
  | 'unsupported-browser'
  | 'permission-denied'
  | 'scan-aborted'
  | 'empty-selection'

export class FileSystemAccessError extends Error {
  code: FileSystemAccessErrorCode

  constructor(code: FileSystemAccessErrorCode, message: string) {
    super(message)
    this.name = 'FileSystemAccessError'
    this.code = code
  }
}
