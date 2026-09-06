import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useModalFocus } from '../useModalFocus'
import { useAnnotationStore } from '../../features/annotations/store/annotationStore'
import { useCollectionStore } from '../../features/collections/store/collectionStore'
import { useLibraryStore } from '../../features/library/store/libraryStore'
import { usePlaybackStore } from '../../features/playback/store/playbackStore'
import { useSettingsStore } from '../../features/settings/store/settingsStore'
import {
  acceptLegacyMigration, flushUserData, getPersistenceStatus, initializeUserData,
  reportPersistenceFailure, retryUserData, subscribePersistence, exportRecovery,
} from './userDataCoordinator'

const stores = [useAnnotationStore, useCollectionStore, useLibraryStore, usePlaybackStore, useSettingsStore]
let hydration: Promise<void> | null = null
export function UserDataGate({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(subscribePersistence, getPersistenceStatus)
  const [hydrated, setHydrated] = useState(false)
  const dialogRef = useRef<HTMLElement>(null)
  useModalFocus(dialogRef, !hydrated || status.phase !== 'ready', () => {})
  useEffect(() => { void initializeUserData() }, [])
  useEffect(() => {
    if (status.phase !== 'ready' || hydrated) return
    hydration ??= (async () => {
      await Promise.all(stores.map((store) => store.persist.rehydrate()))
      if (stores.some((store) => !store.persist.hasHydrated())) throw new Error('Some user data could not be loaded. Export recovery data before retrying.')
      await flushUserData()
    })()
    void hydration.then(() => setHydrated(true)).catch((error: unknown) => { hydration = null; reportPersistenceFailure(error) })
  }, [hydrated, status.phase])

  const migration = status.phase === 'migration'
  const failed = status.phase === 'error'
  const panel = <main className="flex h-full items-center justify-center bg-surface-dim p-8 text-on-surface">
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="data-startup-title" className="w-full max-w-2xl space-y-5 border border-white/15 bg-surface-container p-8">
      <h1 id="data-startup-title" className="text-2xl font-bold">{migration ? 'Protect your existing organization' : failed ? 'Your data needs attention' : 'Loading your library data…'}</h1>
      {migration && <>
        <p>VOID found {Object.keys(status.records ?? {}).length} saved data stores in this app origin. Continue to copy them into versioned, transactional storage. The original data stays in place and a recovery snapshot is retained.</p>
        <ul className="space-y-1 text-sm">{Object.entries(status.records ?? {}).map(([name, value]) => {
          const state = (JSON.parse(value) as { state: Record<string, unknown> }).state
          const count = Object.values(state).reduce<number>((sum, item) => sum + (Array.isArray(item) ? item.length : item && typeof item === 'object' ? Object.keys(item).length : 0), 0)
          return <li key={name}>{name.replace('void-', '').replace('-store', '')}: {count} stored entries/references</li>
        })}</ul>
        <p className="text-sm">Review/export this snapshot before continuing. Data from other browser profiles or development origins is not discovered automatically.</p>
      </>}
      {failed && <p role="alert">{status.message} Your saved metadata has not been reset. Export recovery data before reloading if there are unsaved changes.</p>}
      {(migration || failed) && <div className="flex flex-wrap gap-3">
        <button className="border px-4 py-2" onClick={() => void exportRecovery()}>Export recovery data</button>
        {migration && <button className="bg-primary px-4 py-2 font-bold" onClick={() => void acceptLegacyMigration()}>Migrate and continue</button>}
        {failed && <button className="border px-4 py-2" onClick={() => void retryUserData()}>Retry</button>}
        {failed && <button className="border px-4 py-2" onClick={() => location.reload()}>Reload saved data</button>}
      </div>}
    </section>
  </main>
  return hydrated ? <div className="h-full"><div className="h-full">{children}</div>{status.phase !== 'ready' && <div className="fixed inset-0 z-[500]">{panel}</div>}</div> : panel
}
