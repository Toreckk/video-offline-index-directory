import './browserTypes'
import { FileSystemAccessError } from './errors'
import type { DirectoryPickerOptions } from './apiTypes'

export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export async function pickDirectory(options: DirectoryPickerOptions = {}) {
  if (!isFileSystemAccessSupported() || !window.showDirectoryPicker) {
    throw new FileSystemAccessError(
      'unsupported-browser',
      'Directory picking is only supported in Chromium browsers.',
    )
  }

  return window.showDirectoryPicker({ ...options, mode: 'read' })
}
