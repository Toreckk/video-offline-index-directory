import { describe, expect, it } from 'vitest'
import {
  FileSystemAccessError,
  queryPermissionStatus,
  requestPermission,
  requestPermissionStatus,
  verifyPermission,
} from './index'

describe('directory permissions', () => {
  it('verifies granted read permission', async () => {
    const handle = createPermissionHandle('granted')

    await expect(verifyPermission(handle)).resolves.toBe(true)
  })

  it('returns false when read permission is not already granted', async () => {
    const handle = createPermissionHandle('prompt')

    await expect(verifyPermission(handle)).resolves.toBe(false)
  })

  it('returns the exact queried permission status', async () => {
    const handle = createPermissionHandle('denied')

    await expect(queryPermissionStatus(handle)).resolves.toBe('denied')
  })

  it('requests read permission and resolves when granted', async () => {
    const handle = createPermissionHandle('granted')

    await expect(requestPermission(handle)).resolves.toBe(true)
  })

  it('returns the exact requested permission status', async () => {
    const handle = createPermissionHandle('prompt')

    await expect(requestPermissionStatus(handle)).resolves.toBe('prompt')
  })

  it('throws a typed error when permission is denied', async () => {
    const handle = createPermissionHandle('denied')

    await expect(requestPermission(handle)).rejects.toMatchObject({
      code: 'permission-denied',
    } satisfies Partial<FileSystemAccessError>)
  })
})

function createPermissionHandle(
  permissionState: PermissionState,
): FileSystemDirectoryHandle {
  return {
    kind: 'directory',
    name: 'Videos',
    queryPermission: async () => permissionState,
    requestPermission: async () => permissionState,
  } as FileSystemDirectoryHandle
}
