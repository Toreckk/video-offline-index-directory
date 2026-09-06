import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getVoidPlatform, type NativeLibrarySelection } from '@void/core'
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
import { createLibraryId, isSameDirectory, sameNativeRoot } from '../services/libraryIdentity'
import { idbStateStorage } from '../../../shared/persistence/idbStateStorage'
import { deleteMediaCatalog } from '../../media/services/mediaCatalogCache'
import { restoreMediaCatalog } from '../../media/services/mediaCatalogCache'
import { useMediaStore } from '../../media/store/mediaStore'

export const DIRECTORY_HANDLE_KEY = 'void-directory-handle'
export const LIBRARY_STATE_KEY = 'void-library-store'

export type LibraryPermissionStatus = 'unknown' | 'granted' | 'prompt' | 'denied'
export type LibrarySourceKind = 'persistent-handle' | 'session-files' | 'native-directory'

export type RecentDirectory = {
  rootPath?: string
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
  stage: 'discovery' | 'metadata' | 'thumbnail' | 'watcher' | 'reconciliation'
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
  rootPath: string | null
  directoryName: string | null
  permissionStatus: LibraryPermissionStatus
  scanStatus: ScanStatus
  scanPhase: ScanPhase
  scanProgress: ScanProgress
  scanError: string | null
  scanDiagnostics: ScanDiagnostic[]
  recentDirectories: RecentDirectory[]
  libraryRegistry: Record<string, { name: string; rootPath?: string }>
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
  selectNativeDirectory: (
    selection: NativeLibrarySelection,
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
      rootPath: null,
      directoryName: null,
      permissionStatus: 'unknown',
      ...resetScanState,
      recentDirectories: [],
      libraryRegistry: {},
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
          rootPath: null,
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
          rootPath: null,
          directoryName: selection.rootName,
          permissionStatus: 'granted',
        })
        await deleteFromIndexedDb(DIRECTORY_HANDLE_KEY)
        get().addRecentDirectory(libraryId, selection.rootName)
        return libraryId
      },

      selectNativeDirectory: async (selection, options = {}) => {
        const current = get()
        const sameDirectory =
          current.sourceKind === 'native-directory' &&
          Boolean(current.rootPath && sameNativeRoot(current.rootPath, selection.rootPath))
        const libraryId =
          options.libraryId ??
          (sameDirectory && current.libraryId ? current.libraryId : Object.entries(current.libraryRegistry).find(([, entry]) => entry.rootPath && sameNativeRoot(entry.rootPath, selection.rootPath))?.[0] ?? createLibraryId())
        set({
          libraryId,
          sourceKind: 'native-directory',
          directoryHandle: null,
          sessionFiles: [],
          rootPath: selection.rootPath,
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

          const platform = getVoidPlatform()
          if (
            platform.kind === 'desktop' &&
            persisted.sourceKind === 'native-directory' &&
            persisted.libraryId &&
            persisted.directoryName &&
            persisted.rootPath
          ) {
            if (!platform.restoreLibrary) {
              set({ permissionStatus: 'prompt', ...resetScanState, scanError: 'Desktop folder access is unavailable. Restart VOID and try reconnecting.' })
              return
            }
            let selection: NativeLibrarySelection
            try {
              selection = await platform.restoreLibrary(
                persisted.libraryId,
                persisted.rootPath,
              )
            } catch (error) {
              console.warn('The saved native library needs to be selected again.', error)
              set({ permissionStatus: 'prompt', ...resetScanState })
              try {
                const assets = (await restoreMediaCatalog(persisted.libraryId, persisted.rootPath)).map((asset) => ({ ...asset, availability: 'unavailable' as const }))
                useMediaStore.getState().replaceAssets(assets)
                set({ mediaIds: assets.map((asset) => asset.id), scanStatus: assets.length ? 'ready' : 'idle', scanError: 'The saved folder could not be authorized. Reconnect Library will retry, then let you select the same folder to restore access.' })
              } catch { /* The reconnect controls remain available when the catalog is also missing. */ }
              return
            }
            set({
              directoryHandle: null,
              sessionFiles: [],
              rootPath: selection.rootPath,
              directoryName: selection.rootName,
              permissionStatus: 'granted',
              ...resetScanState,
            })
            return
          }

          if (
            persisted.sourceKind === 'session-files' &&
            persisted.libraryId &&
            persisted.directoryName
          ) {
            set({
              directoryHandle: null,
              sessionFiles: [],
              rootPath: null,
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
              rootPath: null,
              directoryName: handle.name,
              permissionStatus,
              ...resetScanState,
            })
          } else {
            set({
              directoryHandle: null,
              sessionFiles: [],
              rootPath: null,
              permissionStatus: persisted.libraryId ? 'prompt' : 'unknown',
              ...resetScanState,
            })
          }
        } catch (error) {
          console.error('Error restoring persisted directory handle', error)
          set({
            directoryHandle: null,
            sessionFiles: [],
            rootPath: null,
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
          rootPath: get().sourceKind === 'native-directory' ? get().rootPath : null,
          permissionStatus: hasRememberedLibrary ? 'prompt' : 'unknown',
          ...resetScanState,
          isLoadingPersistedLibrary: false,
        })
      },

      requestLibraryPermission: async () => {
        const current = get()
        if (
          current.sourceKind === 'native-directory' &&
          current.libraryId &&
          current.rootPath
        ) {
          const platform = getVoidPlatform()
          try {
            let selection: NativeLibrarySelection
            try {
              if (!platform.restoreLibrary) throw new Error('Desktop restore is unavailable.')
              selection = await platform.restoreLibrary(current.libraryId, current.rootPath)
            } catch {
              // Migration or a cleared cache may leave a valid saved root without
              // a trusted native catalog. A user-picked folder reauthorizes access.
              if (!platform.selectLibrary) throw new Error('Select the saved folder again using Choose Another Folder.')
              const picked = await platform.selectLibrary()
              if (!picked) {
                set({ permissionStatus: 'prompt', scanError: 'Reconnect cancelled. Your saved library and metadata were kept.' })
                return false
              }
              if (!sameNativeRoot(current.rootPath, picked.rootPath)) throw new Error(`Select the saved folder “${current.rootPath}” to reconnect. Use Choose Another Folder for a different library.`)
              selection = picked
            }
            if (get().libraryId !== current.libraryId || get().rootPath !== current.rootPath) return false
            set({
              rootPath: selection.rootPath,
              directoryName: selection.rootName,
              permissionStatus: 'granted',
              scanError: null,
            })
            get().addRecentDirectory(current.libraryId, selection.rootName)
            return true
          } catch (error) {
            console.warn('The native library could not be reconnected.', error)
            set({ permissionStatus: 'prompt', scanError: error instanceof Error ? error.message : 'The folder could not be reconnected. Select it again.' })
            return false
          }
        }
        const { directoryHandle } = current
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
          rootPath: null,
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
          libraryRegistry: { ...get().libraryRegistry, [libraryId]: { name, ...(get().rootPath ? { rootPath: get().rootPath! } : {}) } },
          recentDirectories: [
            { libraryId, name, timestamp, ...(get().rootPath ? { rootPath: get().rootPath! } : {}) },
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
      skipHydration: true,
      partialize: (state) => ({
        libraryId: state.libraryId,
        sourceKind: state.sourceKind,
        rootPath: state.rootPath,
        directoryName: state.directoryName,
        recentDirectories: state.recentDirectories,
        libraryRegistry: state.libraryRegistry,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<LibraryState>
        const libraryRegistry = { ...saved.libraryRegistry }
        for (const recent of saved.recentDirectories ?? []) {
          if (recent.libraryId && recent.rootPath) libraryRegistry[recent.libraryId] ??= { name: recent.name, rootPath: recent.rootPath }
        }
        if (saved.libraryId && saved.directoryName) libraryRegistry[saved.libraryId] ??= { name: saved.directoryName, ...(saved.rootPath ? { rootPath: saved.rootPath } : {}) }
        return { ...current, ...saved, libraryRegistry, ...resetScanState, permissionStatus: 'unknown', directoryHandle: null, sessionFiles: [], isHydrated: false, isLoadingPersistedLibrary: true }
      },
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
