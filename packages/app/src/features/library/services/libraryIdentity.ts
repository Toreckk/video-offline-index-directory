export function createLibraryId() {
  return `lib_${crypto.randomUUID()}`
}

/** Compare canonical Windows picker paths without confusing same-named folders. */
export function sameNativeRoot(left: string, right: string) {
  const normalize = (path: string) => path.replaceAll('/', '\\').replace(/^\\\\\?\\/, '').replace(/\\+$/, '').toLowerCase()
  return normalize(left) === normalize(right)
}

export async function isSameDirectory(
  currentHandle: FileSystemDirectoryHandle | null,
  nextHandle: FileSystemDirectoryHandle,
) {
  if (!currentHandle || !('isSameEntry' in currentHandle)) return false

  try {
    return await currentHandle.isSameEntry(nextHandle)
  } catch (error) {
    console.error('Could not compare selected directory handles', error)
    return false
  }
}

export function assertMatchingLibraryName(
  expectedName: string | null,
  selectedName: string,
) {
  if (expectedName && expectedName !== selectedName) {
    throw new Error(
      `Choose “${expectedName}” to reconnect this library, or configure “${selectedName}” as a new library.`,
    )
  }
}
