import { describe, expect, it, vi, beforeEach } from 'vitest'
import { get } from 'idb-keyval'
import {
  queryPermissionStatus,
  requestPermissionStatus,
} from '../services/fileSystem'
import {
  useLibraryStore,
  DIRECTORY_HANDLE_KEY,
  LIBRARY_STATE_KEY,
  migrateLibraryState,
} from './libraryStore'

const db = vi.hoisted(() => new Map<string, unknown>())

vi.mock('idb-keyval', () => {
  return {
    get: vi.fn(async (key) => db.get(key)),
    set: vi.fn(async (key, val) => {
      db.set(key, val)
    }),
    del: vi.fn(async (key) => {
      db.delete(key)
    }),
  }
})

vi.mock('../services/fileSystem', () => {
  return {
    queryPermissionStatus: vi.fn(),
    requestPermissionStatus: vi.fn(),
  }
})

describe('useLibraryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.clear()

    useLibraryStore.setState({
      libraryId: null,
      sourceKind: null,
      directoryHandle: null,
      sessionFiles: [],
      directoryName: null,
      permissionStatus: 'unknown',
      scanStatus: 'idle',
      scanProgress: {
        foldersScanned: 0,
        videosFound: 0,
        thumbnailsGenerated: 0,
        thumbnailTotal: 0,
      },
      scanError: null,
      scanDiagnostics: [],
      recentDirectories: [],
      mediaIds: [],
      isBackgroundScanning: false,
      isHydrated: false,
      isLoadingPersistedLibrary: false,
    })
  })

  it('deduplicates scan diagnostics and clears them on reset', () => {
    const diagnostic = { stage: 'thumbnail' as const, severity: 'warning' as const, path: 'clip.mp4', message: 'Unsupported codec' }
    useLibraryStore.getState().addScanDiagnostic(diagnostic)
    useLibraryStore.getState().addScanDiagnostic(diagnostic)
    expect(useLibraryStore.getState().scanDiagnostics).toHaveLength(1)
    useLibraryStore.getState().resetScan()
    expect(useLibraryStore.getState().scanDiagnostics).toEqual([])
  })

  it('excludes directoryHandle from the JSON-persisted Zustand slice', async () => {
    const mockHandle = {
      name: 'folder',
      kind: 'directory',
    } as unknown as FileSystemDirectoryHandle
    db.set(DIRECTORY_HANDLE_KEY, mockHandle)

    // Call an action that triggers state change and persist serialization
    useLibraryStore
      .getState()
      .addRecentDirectory('lib_new', 'my-new-library')

    const storedStateString = db.get(LIBRARY_STATE_KEY)
    expect(storedStateString).toBeDefined()

    expect(typeof storedStateString).toBe('string')
    const parsed = JSON.parse(storedStateString as string)
    expect(parsed.state).not.toHaveProperty('directoryHandle')
    expect(parsed.state).not.toHaveProperty('sessionFiles')
    expect(parsed.state).not.toHaveProperty('isHydrated')
    expect(parsed.state).not.toHaveProperty('isLoadingPersistedLibrary')
    expect(parsed.state.recentDirectories[0]?.name).toBe('my-new-library')
  })

  it('restores handle and sets permissionStatus to granted when queryPermissionStatus returns granted', async () => {
    const mockHandle = {
      name: 'my-folder',
      kind: 'directory',
    } as unknown as FileSystemDirectoryHandle
    db.set(DIRECTORY_HANDLE_KEY, mockHandle)
    vi.mocked(queryPermissionStatus).mockResolvedValue('granted')

    await useLibraryStore.getState().restorePersistedDirectoryHandle()

    expect(useLibraryStore.getState().directoryHandle).toBe(mockHandle)
    expect(useLibraryStore.getState().directoryName).toBe('my-folder')
    expect(useLibraryStore.getState().libraryId).toMatch(/^lib_/)
    expect(useLibraryStore.getState().sourceKind).toBe('persistent-handle')
    expect(useLibraryStore.getState().permissionStatus).toBe('granted')
    expect(useLibraryStore.getState().isLoadingPersistedLibrary).toBe(false)
  })

  it('restores handle and sets permissionStatus to prompt without requesting permission', async () => {
    const mockHandle = {
      name: 'my-folder',
      kind: 'directory',
    } as unknown as FileSystemDirectoryHandle
    db.set(DIRECTORY_HANDLE_KEY, mockHandle)
    vi.mocked(queryPermissionStatus).mockResolvedValue('prompt')

    await useLibraryStore.getState().restorePersistedDirectoryHandle()

    expect(useLibraryStore.getState().directoryHandle).toBe(mockHandle)
    expect(useLibraryStore.getState().permissionStatus).toBe('prompt')
    expect(requestPermissionStatus).not.toHaveBeenCalled()
  })

  it('invokes requestPermission on the handle only when requestLibraryPermission is explicitly called', async () => {
    const mockHandle = {
      name: 'my-folder',
      kind: 'directory',
    } as unknown as FileSystemDirectoryHandle
    useLibraryStore.setState({
      directoryHandle: mockHandle,
      permissionStatus: 'prompt',
    })
    vi.mocked(requestPermissionStatus).mockResolvedValue('granted')

    const result = await useLibraryStore.getState().requestLibraryPermission()

    expect(result).toBe(true)
    expect(requestPermissionStatus).toHaveBeenCalledWith(mockHandle)
    expect(useLibraryStore.getState().permissionStatus).toBe('granted')
  })

  it('deduplicates and shifts latest entry to the top of recentDirectories', () => {
    useLibraryStore.setState({
      recentDirectories: [
        { libraryId: 'lib_oldest', name: 'oldest', timestamp: 10 },
        { libraryId: 'lib_middle', name: 'middle', timestamp: 20 },
        { libraryId: 'lib_newest', name: 'newest', timestamp: 30 },
      ],
    })

    useLibraryStore.getState().addRecentDirectory('lib_middle', 'middle')

    const recents = useLibraryStore.getState().recentDirectories
    expect(recents).toHaveLength(3)
    expect(recents[0]?.name).toBe('middle')
    expect(recents[1]?.name).toBe('newest')
    expect(recents[2]?.name).toBe('oldest')
  })

  it('resets scan progress and status but preserves directoryHandle', () => {
    const mockHandle = {
      name: 'my-folder',
      kind: 'directory',
    } as unknown as FileSystemDirectoryHandle
    useLibraryStore.setState({
      directoryHandle: mockHandle,
      scanStatus: 'scanning',
      scanProgress: {
        foldersScanned: 5,
        videosFound: 10,
        thumbnailsGenerated: 2,
        thumbnailTotal: 10,
      },
      scanError: 'Failed indexing file',
    })

    useLibraryStore.getState().resetScan()

    const state = useLibraryStore.getState()
    expect(state.directoryHandle).toBe(mockHandle)
    expect(state.scanStatus).toBe('idle')
    expect(state.scanError).toBeNull()
    expect(state.scanProgress).toEqual({
      foldersScanned: 0,
      videosFound: 0,
      thumbnailsGenerated: 0,
      thumbnailTotal: 0,
    })
  })

  it('handles restore failure gracefully without crashing and sets loading to false', async () => {
    vi.mocked(get).mockRejectedValueOnce(new Error('IndexedDB corrupt'))

    await useLibraryStore.getState().restorePersistedDirectoryHandle()

    const state = useLibraryStore.getState()
    expect(state.isLoadingPersistedLibrary).toBe(false)
    expect(state.directoryHandle).toBeNull()
    expect(state.permissionStatus).toBe('denied')
  })

  it('clearLibrary clears directoryHandle and direct storage but keeps recentDirectories', async () => {
    const mockHandle = {
      name: 'my-folder',
      kind: 'directory',
    } as unknown as FileSystemDirectoryHandle
    useLibraryStore.setState({
      libraryId: 'lib_my_folder',
      sourceKind: 'persistent-handle',
      directoryHandle: mockHandle,
      recentDirectories: [
        { libraryId: 'lib_my_folder', name: 'my-folder', timestamp: 10 },
      ],
    })
    db.set(DIRECTORY_HANDLE_KEY, mockHandle)

    await useLibraryStore.getState().clearLibrary()

    const state = useLibraryStore.getState()
    expect(state.directoryHandle).toBeNull()
    expect(state.recentDirectories).toEqual([
      { libraryId: 'lib_my_folder', name: 'my-folder', timestamp: 10 },
    ])
    expect(db.has(DIRECTORY_HANDLE_KEY)).toBe(false)
  })

  it('restores a session-file library as reconnect-required without persisting files', async () => {
    useLibraryStore.setState({
      libraryId: 'lib_firefox',
      sourceKind: 'session-files',
      directoryName: 'Firefox Videos',
      sessionFiles: [{ name: 'clip.mp4' } as File],
    })

    await useLibraryStore.getState().restorePersistedDirectoryHandle()

    const state = useLibraryStore.getState()
    expect(state.libraryId).toBe('lib_firefox')
    expect(state.sourceKind).toBe('session-files')
    expect(state.sessionFiles).toEqual([])
    expect(state.permissionStatus).toBe('prompt')
  })

  it('reuses an explicit durable id when reconnecting session files', async () => {
    const file = { name: 'clip.mp4' } as File

    const libraryId = await useLibraryStore
      .getState()
      .selectSessionDirectory(
        { rootName: 'Videos', files: [file] },
        { libraryId: 'lib_existing' },
      )

    expect(libraryId).toBe('lib_existing')
    expect(useLibraryStore.getState()).toMatchObject({
      libraryId: 'lib_existing',
      sourceKind: 'session-files',
      directoryName: 'Videos',
      permissionStatus: 'granted',
    })
  })

  it('retains the durable id when Chromium returns the same directory entry', async () => {
    const nextHandle = {
      name: 'Videos',
      kind: 'directory',
    } as unknown as FileSystemDirectoryHandle
    const currentHandle = {
      name: 'Videos',
      kind: 'directory',
      isSameEntry: vi.fn(async () => true),
    } as unknown as FileSystemDirectoryHandle
    useLibraryStore.setState({
      libraryId: 'lib_stable',
      sourceKind: 'persistent-handle',
      directoryHandle: currentHandle,
    })
    vi.mocked(queryPermissionStatus).mockResolvedValue('granted')

    const libraryId = await useLibraryStore
      .getState()
      .selectDirectory(nextHandle)

    expect(libraryId).toBe('lib_stable')
    expect(currentHandle.isSameEntry).toHaveBeenCalledWith(nextHandle)
  })

  it('keeps identically named libraries distinct in recent history', () => {
    useLibraryStore.getState().addRecentDirectory('lib_one', 'Videos')
    useLibraryStore.getState().addRecentDirectory('lib_two', 'Videos')

    expect(useLibraryStore.getState().recentDirectories).toMatchObject([
      { libraryId: 'lib_two', name: 'Videos' },
      { libraryId: 'lib_one', name: 'Videos' },
    ])
  })

  it('migrates legacy name-based state to a durable library namespace', () => {
    const migrated = migrateLibraryState({
      directoryName: 'Videos',
      recentDirectories: [{ name: 'Videos', timestamp: 10 }],
    })

    expect(migrated.libraryId).toMatch(/^lib_/)
    expect(migrated.sourceKind).toBe('persistent-handle')
    expect(migrated.recentDirectories[0]?.libraryId).toBe(migrated.libraryId)
  })
})
