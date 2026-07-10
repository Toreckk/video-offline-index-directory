import { FileSystemAccessError } from './errors'

export type DirectoryFileSelection = {
  rootName: string
  files: File[]
}

export function isDirectoryFilePickerSupported() {
  return (
    typeof document !== 'undefined' &&
    typeof window !== 'undefined' &&
    'HTMLInputElement' in window
  )
}

export function createDirectoryFileSelection(
  selectedFiles: Iterable<File>,
): DirectoryFileSelection {
  const files = Array.from(selectedFiles)
  const firstPath = files[0]?.webkitRelativePath
  const rootName = firstPath?.split('/').filter(Boolean)[0]

  if (!rootName) {
    throw new FileSystemAccessError(
      'empty-selection',
      'Choose a folder containing at least one file so VOID can reconnect it.',
    )
  }

  return { rootName, files }
}

export function pickDirectoryFiles(): Promise<DirectoryFileSelection> {
  if (!isDirectoryFilePickerSupported()) {
    throw new FileSystemAccessError(
      'unsupported-browser',
      'This browser cannot select local folders.',
    )
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.setAttribute('webkitdirectory', '')
    input.setAttribute('directory', '')
    input.accept = '.mp4,.webm'
    input.hidden = true

    const cleanup = () => input.remove()
    const handleCancel = () => {
      cleanup()
      reject(new DOMException('Folder selection cancelled.', 'AbortError'))
    }
    const handleChange = () => {
      try {
        resolve(createDirectoryFileSelection(input.files ?? []))
      } catch (error) {
        reject(error)
      } finally {
        cleanup()
      }
    }

    input.addEventListener('cancel', handleCancel, { once: true })
    input.addEventListener('change', handleChange, { once: true })
    document.body.append(input)
    input.click()
  })
}
