import './browserTypes'
import { FileSystemAccessError } from './errors'
import type { DirectoryPermissionOptions } from './apiTypes'

export async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  options: DirectoryPermissionOptions = {},
) {
  const permission = await handle.queryPermission({
    mode: options.mode ?? 'read',
  })

  return permission === 'granted'
}

export async function requestPermission(
  handle: FileSystemDirectoryHandle,
  options: DirectoryPermissionOptions = {},
) {
  const permission = await handle.requestPermission({
    mode: options.mode ?? 'read',
  })

  if (permission !== 'granted') {
    throw new FileSystemAccessError(
      'permission-denied',
      'Permission is needed before VOID can index this folder.',
    )
  }

  return true
}
