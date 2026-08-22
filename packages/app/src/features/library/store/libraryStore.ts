import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  del as deleteFromIndexedDb,
  get as getFromIndexedDb,
  set as setInIndexedDb,
} from 'idb-keyval'
import {
  queryPermissionStatus,
  requestPermissionStatus,
  type DirectoryFileSelection,
} from '../services/fileSystem'
import { createLibraryId, isSameDirectory } from '../services/libraryIdentity'
import { idbStateStorage } from '../../../shared/persistence/idbStateStorage'
import { deleteMediaCatalog } from '../../explorer/services/mediaCatalogCache'

export const DIRECTORY_HANDLE_KEY = 'void-directory-handle'
export const LIBRARY_STATE_KEY = 'void-library-store'

export type LibraryPermissionStatus = 'unknown' | 'granted' | 'prompt' | 'denied'
export type LibrarySourceKind = 'persistent-handle' | 'session-files'

export type RecentDirectory = {
  libraryId: string
  name: string
  timestamp: number
}

export type ScanProgress = {
  foldersScanned: number
  videosFound: number
  thumbnailsGenerated: number
  thumbnailTotal: number
}

export type ScanStatus = 'idle' | 'scanning' | 'ready' | 'error'
export type ScanPhase = 'idle' | 'discovering' | 'thumbnails' | 'complete'
export type ScanDiagnostic = {
  stage: 'discovery' | 'metadata' | 'thumbnail'
  severity: 'warning' | 'error'
  path: string
  message: string
  timestamp: number
}

export type LibraryState = {
  libraryId: string | null
  sourceKind: LibrarySourceKind | null
  directoryHandle: FileSystemDirectoryHandle | null
  sessionFiles: File[]
  directoryName: string | null
  permissionStatus: LibraryPermissionStatus
  scanStatus: ScanStatus
  scanPhase: ScanPhase
  scanProgress: ScanProgress
  scanError: string | null
  scanDiagnostics: ScanDiagnostic[]
  recentDirectories: RecentDirectory[]
  mediaIds: string[]
  isBackgroundScanning: boolean
  isHydrated: boolean
  isLoadingPersistedLibrary: boolean
}

export type LibraryActions = {
  selectDirectory: (
    handle: FileSystemDirectoryHandle,
    options?: { libraryId?: string },
  ) => Promise<string>
  selectSessionDirectory: (
    selection: DirectoryFileSelection,
    options?: { libraryId?: string },
  ) => Promise<string>
  restorePersistedDirectoryHandle: () => Promise<void>
  skipPersistedDirectoryRestore: () => void
  requestLibraryPermission: () => Promise<boolean>
  clearLibrary: () => Promise<void>
  resetScan: () => void
  updateScanProgress: (partial: Partial<ScanProgress>) => void
  addRecentDirectory: (libraryId: string, name: string) => void
  setScanStatus: (status: ScanStatus) => void
  setScanPhase: (phase: ScanPhase) => void
  setScanError: (error: string | null) => void
  addScanDiagnostic: (diagnostic: Omit<ScanDiagnostic, 'timestamp'>) => void
  setMediaIds: (ids: string[]) => void
  setIsBackgroundScanning: (isBackground: boolean) => void
}

const initialProgress: ScanProgress = {
  foldersScanned: 0,
  videosFound: 0,
  thumbnailsGenerated: 0,
  thumbnailTotal: 0,
}

const resetScanState = {
  scanStatus: 'idle' as const,
  scanPhase: 'idle' as const,
  scanProgress: { ...initialProgress },
  scanError: null,
  scanDiagnostics: [] as ScanDiagnostic[],
  mediaIds: [] as string[],
  isBackgroundScanning: false,
}

export const useLibraryStore = create<LibraryState & LibraryActions>()(
  persist(
    (set, get) => ({
      libraryId: null,
      sourceKind: null,
      directoryHandle: null,
      sessionFiles: [],
      directoryName: null,
      permissionStatus: 'unknown',
      ...resetScanState,
      recentDirectories: [],
      isHydrated: false,
      isLoadingPersistedLibrary: true,

      selectDirectory: async (handle, options = {}) => {
        const current = get()
        const sameDirectory = await isSameDirectory(
          current.directoryHandle,
          handle,
        )
        const libraryId =
          options.libraryId ??
          (sameDirectory && current.libraryId
            ? current.libraryId
            : createLibraryId())
        let permissionStatus: LibraryPermissionStatus

        try {
          permissionStatus = await queryPermissionStatus(handle)
        } catch (error) {
          console.error('Failed to verify picked directory permission', error)
          permissionStatus = 'denied'
        }

        set({
          libraryId,
          sourceKind: 'persistent-handle',
          directoryHandle: handle,
          sessionFiles: [],
          directoryName: handle.name,
          permissionStatus,
        })
        await setInIndexedDb(DIRECTORY_HANDLE_KEY, handle)
        get().addRecentDirectory(libraryId, handle.name)
        return libraryId
      },

      selectSessionDirectory: async (selection, options = {}) => {
        const libraryId = options.libraryId ?? createLibraryId()
        set({
          libraryId,
          sourceKind: 'session-files',
          directoryHandle: null,
          sessionFiles: selection.files,
          directoryName: selection.rootName,
          permissionStatus: 'granted',
        })
        await deleteFromIndexedDb(DIRECTORY_HANDLE_KEY)
        get().addRecentDirectory(libraryId, selection.rootName)
        return libraryId
      },

      restorePersistedDirectoryHandle: async () => {
        set({ isLoadingPersistedLibrary: true })
        try {
          const persisted = get()

          if (
            persisted.sourceKind === 'session-files' &&
            persisted.libraryId &&
            persisted.directoryName
          ) {
            set({
              directoryHandle: null,
              sessionFiles: [],
              permissionStatus: 'prompt',
              ...resetScanState,
            })
            return
          }

          const handle = await getFromIndexedDb<FileSystemDirectoryHandle>(
            DIRECTORY_HANDLE_KEY,
          )
          if (handle) {
            let permissionStatus: LibraryPermissionStatus
            try {
              permissionStatus = await queryPermissionStatus(handle)
            } catch (error) {
              console.error('Failed to verify permission on restored handle', error)
              permissionStatus = 'denied'
            }
            set({
              libraryId: persisted.libraryId ?? createLibraryId(),
              sourceKind: 'persistent-handle',
              directoryHandle: handle,
              sessionFiles: [],
              directoryName: handle.name,
              permissionStatus,
              ...resetScanState,
            })
          } else {
            set({
              directoryHandle: null,
              sessionFiles: [],
              permissionStatus: persisted.libraryId ? 'prompt' : 'unknown',
              ...resetScanState,
            })
          }
        } catch (error) {
          console.error('Error restoring persisted directory handle', error)
          set({
            directoryHandle: null,
            sessionFiles: [],
            permissionStatus: 'denied',
          })
        } finally {
          set({ isLoadingPersistedLibrary: false })
        }
      },

      skipPersistedDirectoryRestore: () => {
        const hasRememberedLibrary = Boolean(get().libraryId)
        set({
          directoryHandle: null,
          sessionFiles: [],
          permissionStatus: hasRememberedLibrary ? 'prompt' : 'unknown',
          ...resetScanState,
          isLoadingPersistedLibrary: false,
        })
      },

      requestLibraryPermission: async () => {
        const { directoryHandle } = get()
        if (!directoryHandle) return false

        try {
          const permissionStatus = await requestPermissionStatus(directoryHandle)
          set({ permissionStatus })
          return permissionStatus === 'granted'
        } catch (error) {
          console.error('Request permission failed', error)
          set({ permissionStatus: 'denied' })
          return false
        }
      },

      clearLibrary: async () => {
        const libraryId = get().libraryId
        set({
          libraryId: null,
          sourceKind: null,
          directoryHandle: null,
          sessionFiles: [],
          directoryName: null,
          permissionStatus: 'unknown',
          ...resetScanState,
        })
        await deleteFromIndexedDb(DIRECTORY_HANDLE_KEY)
        if (libraryId) await deleteMediaCatalog(libraryId)
      },

      resetScan: () => set(resetScanState),
      updateScanProgress: (partial) =>
        set((state) => ({
          scanProgress: { ...state.scanProgress, ...partial },
        })),
      addRecentDirectory: (libraryId, name) => {
        const timestamp = Date.now()
        const filtered = get()
          .recentDirectories.filter(
            (directory) => directory.libraryId !== libraryId,
          )
          .sort((left, right) => right.timestamp - left.timestamp)
        set({
          recentDirectories: [
            { libraryId, name, timestamp },
            ...filtered,
          ].slice(0, 5),
        })
      },
      setScanStatus: (scanStatus) => set({ scanStatus }),
      setScanPhase: (scanPhase) => set({ scanPhase }),
      setScanError: (scanError) => set({ scanError }),
      addScanDiagnostic: (diagnostic) =>
        set((state) => {
          const timestamp = Date.now()
          const duplicate = state.scanDiagnostics.some(
            (item) => item.stage === diagnostic.stage && item.path === diagnostic.path && item.message === diagnostic.message,
          )
          return duplicate ? state : { scanDiagnostics: [{ ...diagnostic, timestamp }, ...state.scanDiagnostics].slice(0, 100) }
        }),
      setMediaIds: (mediaIds) => set({ mediaIds }),
      setIsBackgroundScanning: (isBackgroundScanning) =>
        set({ isBackgroundScanning }),
    }),
    {
      name: LIBRARY_STATE_KEY,
      storage: createJSONStorage(() => idbStateStorage),
      partialize: (state) => ({
        libraryId: state.libraryId,
        sourceKind: state.sourceKind,
        directoryName: state.directoryName,
        permissionStatus: state.permissionStatus,
        scanStatus: state.scanStatus,
        scanPhase: state.scanPhase,
        scanProgress: state.scanProgress,
        scanError: state.scanError,
        recentDirectories: state.recentDirectories,
        mediaIds: state.mediaIds,
        isBackgroundScanning: state.isBackgroundScanning,
      }),
      version: 2,
      migrate: (persistedState) => migrateLibraryState(persistedState),
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.error('Failed to hydrate library store', error)
        useLibraryStore.setState({ isHydrated: true })
      },
    },
  ),
)

type LegacyRecentDirectory = Partial<RecentDirectory> & { name: string }
type PersistedLibraryState = Partial<LibraryState> & {
  recentDirectories?: LegacyRecentDirectory[]
}

export function migrateLibraryState(persistedState: unknown) {
  const state = (persistedState ?? {}) as PersistedLibraryState
  const libraryId =
    state.libraryId ?? (state.directoryName ? createLibraryId() : null)
  const sourceKind =
    state.sourceKind ?? (state.directoryName ? 'persistent-handle' : null)
  const recentDirectories = (state.recentDirectories ?? []).map((directory) => ({
    libraryId:
      directory.libraryId ??
      (directory.name === state.directoryName && libraryId
        ? libraryId
        : createLibraryId()),
    name: directory.name,
    timestamp: directory.timestamp ?? Date.now(),
  }))

  return { ...state, libraryId, sourceKind, recentDirectories }
}
