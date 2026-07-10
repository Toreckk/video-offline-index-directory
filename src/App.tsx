import { useEffect, useRef } from 'react'
import { APP_VIEWS } from './app/views'
import { AppNavigationProvider } from './app/navigation'
import { useAppNavigation } from './app/navigationContext'
import Sidebar from './components/sidebar/Sidebar'
import { LibraryRouteProvider } from './features/library/components/LibraryRouteProvider'
import { useLibraryStore } from './features/library/store/libraryStore'
import { useSettingsStore } from './features/settings/store/settingsStore'
import { PlayerModal } from './features/player/components/PlayerModal'
import { BackgroundWorkCoordinator } from './features/explorer/components/BackgroundWorkCoordinator'

export default function App() {
  const restoreStartedRef = useRef(false)
  const isHydrated = useLibraryStore((state) => state.isHydrated)
  const isLoadingPersistedLibrary = useLibraryStore(
    (state) => state.isLoadingPersistedLibrary,
  )
  const restorePersistedDirectoryHandle = useLibraryStore(
    (state) => state.restorePersistedDirectoryHandle,
  )
  const skipPersistedDirectoryRestore = useLibraryStore(
    (state) => state.skipPersistedDirectoryRestore,
  )
  const settingsHydrated = useSettingsStore((state) => state.isHydrated)
  const restoreLastLibrary = useSettingsStore(
    (state) => state.restoreLastLibrary,
  )

  useEffect(() => {
    if (!isHydrated || !settingsHydrated || restoreStartedRef.current) return
    restoreStartedRef.current = true
    if (restoreLastLibrary) {
      void restorePersistedDirectoryHandle()
    } else {
      skipPersistedDirectoryRestore()
    }
  }, [
    isHydrated,
    restoreLastLibrary,
    restorePersistedDirectoryHandle,
    settingsHydrated,
    skipPersistedDirectoryRestore,
  ])

  if (!isHydrated || !settingsHydrated || isLoadingPersistedLibrary) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-dim text-on-surface/70">
        <div className="text-sm font-bold tracking-[0.05em] uppercase animate-pulse">
          Loading Library...
        </div>
      </div>
    )
  }

  return (
    <AppNavigationProvider>
      <LibraryRouteProvider>
        <AppShell />
      </LibraryRouteProvider>
    </AppNavigationProvider>
  )
}

function AppShell() {
  const { activeView, navigate } = useAppNavigation()

  const activeViewConfig =
    APP_VIEWS.find((view) => view.id === activeView) ?? APP_VIEWS[0]
  const ActiveViewComponent = activeViewConfig.component

  return (
    <div className="flex min-h-screen bg-surface-dim">
      <BackgroundWorkCoordinator />
      <Sidebar
        activeView={activeView}
        navItems={APP_VIEWS}
        onNavigate={navigate}
      />

      <main className="ml-[var(--spacing-sidebar)] flex min-h-screen flex-1">
        <ActiveViewComponent />
      </main>
      <PlayerModal />
    </div>
  )
}
