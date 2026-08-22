import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getVoidPlatform } from '@void/core'
import { useAppNavigation } from '../../../app/navigationContext'
import { VIEW_IDS } from '../../../app/views'
import { useSettingsStore } from '../../settings/store/settingsStore'
import {
  isFileSystemAccessSupported,
  pickDirectory,
  pickDirectoryFiles,
} from '../services/fileSystem'
import type { LibraryScanSource } from '../../media/services/mediaFileSource'
import { assertMatchingLibraryName } from '../services/libraryIdentity'
import { useLibraryStore } from '../store/libraryStore'
import { useLibraryScanner } from '../hooks/useLibraryScanner'
import { LibraryRouteDialog } from './LibraryRouteDialog'
import { LibraryStatusOverlay } from './LibraryStatusOverlay'
import { LibraryRouteContext } from './libraryRouteContext'
import { restoreMediaCatalog } from '../../media/services/mediaCatalogCache'
import { useMediaStore } from '../../media/store/mediaStore'

export function LibraryRouteProvider({ children }: { children: ReactNode }) {
  const { navigate } = useAppNavigation()
  const { startScan, cancelScan } = useLibraryScanner()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPickerBusy, setIsPickerBusy] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [successDismissed, setSuccessDismissed] = useState(false)
  const automaticallyScannedSourceRef = useRef<string | null>(null)
  const scanSubfolders = useSettingsStore((state) => state.scanSubfolders)
  const selectDirectory = useLibraryStore((state) => state.selectDirectory)
  const selectSessionDirectory = useLibraryStore(
    (state) => state.selectSessionDirectory,
  )
  const requestLibraryPermission = useLibraryStore(
    (state) => state.requestLibraryPermission,
  )
  const directoryHandle = useLibraryStore((state) => state.directoryHandle)
  const rootPath = useLibraryStore((state) => state.rootPath)
  const libraryId = useLibraryStore((state) => state.libraryId)
  const directoryName = useLibraryStore((state) => state.directoryName)
  const sourceKind = useLibraryStore((state) => state.sourceKind)
  const permissionStatus = useLibraryStore((state) => state.permissionStatus)
  const platform = getVoidPlatform()
  const hasPersistentDirectoryAccess =
    platform.kind === 'desktop' || isFileSystemAccessSupported()

  const openRouteDialog = useCallback(() => {
    setDialogError(null)
    setIsDialogOpen(true)
  }, [])

  const startCurrentLibraryScan = useCallback(async () => {
    const source = getCurrentScanSource()
    if (!source) return
    setSuccessDismissed(false)
    await startScan(source, { scanSubfolders })
  }, [scanSubfolders, startScan])

  const reconnectAndScan = useCallback(async () => {
    const state = useLibraryStore.getState()
    if (state.sourceKind === 'native-directory' && state.rootPath) {
      await startCurrentLibraryScan()
      return true
    }
    if (state.directoryHandle) {
      const granted = await requestLibraryPermission()
      if (granted) await startCurrentLibraryScan()
      return granted
    }

    try {
      setSuccessDismissed(false)
      if (
        state.sourceKind === 'persistent-handle' &&
        isFileSystemAccessSupported()
      ) {
        const handle = await pickDirectory({
          id: 'void-library',
          startIn: 'videos',
        })
        assertMatchingLibraryName(state.directoryName, handle.name)
        await selectDirectory(handle, {
          libraryId: state.libraryId ?? undefined,
        })
        return true
      }

      const selection = await pickDirectoryFiles()
      assertMatchingLibraryName(state.directoryName, selection.rootName)
      const libraryId = await selectSessionDirectory(selection, {
        libraryId: state.libraryId ?? undefined,
      })
      await startScan(
        {
          kind: 'session-files',
          libraryId,
          rootName: selection.rootName,
          files: selection.files,
        },
        { scanSubfolders },
      )
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false
      console.error('Library reconnection failed', error)
      useLibraryStore
        .getState()
        .setScanError(
          error instanceof Error ? error.message : 'The folder could not be reconnected.',
        )
      return false
    }
  }, [
    requestLibraryPermission,
    scanSubfolders,
    selectDirectory,
    selectSessionDirectory,
    startCurrentLibraryScan,
    startScan,
  ])

  useEffect(() => {
    const canRestoreNative =
      sourceKind === 'native-directory' && Boolean(rootPath)
    const canRestoreHandle =
      sourceKind === 'persistent-handle' && Boolean(directoryHandle)
    if (
      !libraryId ||
      !directoryName ||
      permissionStatus !== 'granted' ||
      (!canRestoreNative && !canRestoreHandle)
    ) {
      return
    }

    const sourceKey = `${sourceKind}:${libraryId}:${rootPath ?? directoryName}`
    if (automaticallyScannedSourceRef.current === sourceKey) return

    const timeoutId = window.setTimeout(() => {
      automaticallyScannedSourceRef.current = sourceKey
      void (async () => {
        let restoredCount = 0
        try {
          const cachedAssets = await restoreMediaCatalog(libraryId, rootPath ?? undefined)
          if (cachedAssets.length > 0) {
            useMediaStore.getState().addAssets(cachedAssets)
            useLibraryStore.getState().setMediaIds(cachedAssets.map((asset) => asset.id))
            restoredCount = cachedAssets.length
          }
        } catch (error) {
          console.warn('Could not restore the cached media catalog.', error)
        }
        const source = getCurrentScanSource()
        if (source) {
          await startScan(source, { scanSubfolders, preserveExisting: restoredCount > 0 })
        }
      })()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [directoryHandle, directoryName, libraryId, permissionStatus, rootPath, scanSubfolders, sourceKind, startScan])

  const handlePickDirectory = useCallback(async () => {
    setIsPickerBusy(true)
    setDialogError(null)
    try {
      setSuccessDismissed(false)
      if (platform.kind === 'desktop' && platform.selectLibrary) {
        const selection = await platform.selectLibrary()
        if (!selection) return
        await useLibraryStore.getState().selectNativeDirectory(selection)
        setIsDialogOpen(false)
        navigate(VIEW_IDS.folders)
        return
      }
      if (isFileSystemAccessSupported()) {
        const handle = await pickDirectory({
          id: 'void-library',
          startIn: 'videos',
        })
        await selectDirectory(handle)
      } else {
        const selection = await pickDirectoryFiles()
        const libraryId = await selectSessionDirectory(selection)
        setIsDialogOpen(false)
        navigate(VIEW_IDS.folders)
        void startScan(
          {
            kind: 'session-files',
            libraryId,
            rootName: selection.rootName,
            files: selection.files,
          },
          { scanSubfolders },
        )
        return
      }
      setIsDialogOpen(false)
      navigate(VIEW_IDS.folders)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setDialogError(
        error instanceof Error ? error.message : 'The folder picker could not be opened.',
      )
    } finally {
      setIsPickerBusy(false)
    }
  }, [
    navigate,
    platform,
    scanSubfolders,
    selectDirectory,
    selectSessionDirectory,
    startScan,
  ])

  const value = useMemo(
    () => ({
      openRouteDialog,
      startCurrentLibraryScan,
      reconnectAndScan,
      cancelScan,
    }),
    [cancelScan, openRouteDialog, reconnectAndScan, startCurrentLibraryScan],
  )

  return (
    <LibraryRouteContext.Provider value={value}>
      {children}
      {isDialogOpen && (
        <LibraryRouteDialog
          isBusy={isPickerBusy}
          error={dialogError}
          hasPersistentDirectoryAccess={hasPersistentDirectoryAccess}
          onClose={() => setIsDialogOpen(false)}
          onPickDirectory={() => void handlePickDirectory()}
        />
      )}
      <LibraryStatusOverlay
        successDismissed={successDismissed}
        onDismissSuccess={() => setSuccessDismissed(true)}
      />
    </LibraryRouteContext.Provider>
  )
}

function getCurrentScanSource(): LibraryScanSource | null {
  const state = useLibraryStore.getState()
  if (!state.libraryId || !state.directoryName) return null

  if (state.sourceKind === 'persistent-handle' && state.directoryHandle) {
    return {
      kind: 'directory-handle',
      libraryId: state.libraryId,
      rootName: state.directoryName,
      directoryHandle: state.directoryHandle,
    }
  }

  if (state.sourceKind === 'session-files' && state.sessionFiles.length > 0) {
    return {
      kind: 'session-files',
      libraryId: state.libraryId,
      rootName: state.directoryName,
      files: state.sessionFiles,
    }
  }

  if (state.sourceKind === 'native-directory' && state.rootPath) {
    return {
      kind: 'native-directory',
      libraryId: state.libraryId,
      rootName: state.directoryName,
      rootPath: state.rootPath,
    }
  }

  return null
}
