import './browserTypes'
import { FileSystemAccessError } from './errors'
import type { DirectoryPermissionOptions } from './apiTypes'

export async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  options: DirectoryPermissionOptions = {},
) {
  const permission = await queryPermissionStatus(handle, options)

  return permission === 'granted'
}

export async function queryPermissionStatus(
  handle: FileSystemDirectoryHandle,
  options: DirectoryPermissionOptions = {},
) {
  return handle.queryPermission({
    mode: options.mode ?? 'read',
  })
}

export async function requestPermission(
  handle: FileSystemDirectoryHandle,
  options: DirectoryPermissionOptions = {},
) {
  const permission = await requestPermissionStatus(handle, options)

  if (permission !== 'granted') {
    throw new FileSystemAccessError(
      'permission-denied',
      'Permission is needed before VOID can index this folder.',
    )
  }

  return true
}

export async function requestPermissionStatus(
  handle: FileSystemDirectoryHandle,
  options: DirectoryPermissionOptions = {},
) {
  return handle.requestPermission({
    mode: options.mode ?? 'read',
  })
}
