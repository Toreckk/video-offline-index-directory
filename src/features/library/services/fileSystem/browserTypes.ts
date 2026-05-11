import type {
  BrowserDirectoryPickerOptions,
  FileSystemPermissionMode,
} from './apiTypes'

declare global {
  interface FileSystemHandlePermissionDescriptor {
    mode?: FileSystemPermissionMode
  }

  interface FileSystemHandle {
    queryPermission(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>
    requestPermission(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>
  }

  interface Window {
    showDirectoryPicker?: (
      options?: BrowserDirectoryPickerOptions,
    ) => Promise<FileSystemDirectoryHandle>
  }
}

export {}
