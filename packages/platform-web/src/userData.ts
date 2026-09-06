import type { UserDataCommit, UserDataPort, UserDataSnapshot } from '@void/core'

type Recovery = { reason: string; snapshot: UserDataSnapshot }
export function createBrowserUserDataPort(databaseName = 'void-user-data'): UserDataPort {
  const open = () => new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    let rejected = false
    request.onupgradeneeded = () => request.result.createObjectStore('data')
    request.onerror = () => reject(request.error)
    request.onblocked = () => { rejected = true; reject(new Error('Close other VOID tabs before opening user data.')) }
    request.onsuccess = () => { if (rejected) request.result.close(); else resolve(request.result) }
  })
  const read = async <T>(key: string): Promise<T | null> => {
    const db = await open()
    return new Promise<T | null>((resolve, reject) => {
      const transaction = db.transaction('data', 'readonly')
      const request = transaction.objectStore('data').get(key)
      transaction.oncomplete = () => { db.close(); resolve(request.result ?? null) }
      transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error('User-data read failed.')) }
    })
  }
  return {
    raw: async () => { const value = await read<unknown>('current'); return value === null ? null : JSON.stringify(value) },
    load: async () => {
      const snapshot = await read<UserDataSnapshot>('current')
      if (snapshot && snapshot.schemaVersion !== 1) throw new Error('This user-data schema requires a newer version of VOID. No data was changed.')
      return snapshot
    },
    recovery: async () => await read<Recovery[]>('recovery') ?? [],
    commit: async (request: UserDataCommit) => {
      if (request.catalog) throw new Error('Native catalog transactions are unavailable in the browser.')
      const db = await open()
      return new Promise<UserDataSnapshot>((resolve, reject) => {
        const transaction = db.transaction('data', 'readwrite')
        const store = transaction.objectStore('data')
        const current = store.get('current')
        let failure: unknown
        let next: UserDataSnapshot
        current.onsuccess = () => {
          try {
            const previous = current.result as UserDataSnapshot | undefined
            if (previous && previous.schemaVersion !== 1) throw new Error('Unsupported user-data schema. No data was changed.')
            if ((previous?.revision ?? 0) !== request.expectedRevision) throw new Error('User data changed in another window. Export unsaved changes, then reload.')
            if (previous && request.migration) throw new Error('Migration cannot replace existing user data.')
            if (!Number.isSafeInteger(request.expectedRevision + 1)) throw new Error('Invalid user-data revision.')
            next = { schemaVersion: 1, revision: request.expectedRevision + 1, records: request.records, migration: request.migration ?? previous?.migration ?? null }
            if (JSON.stringify(next).length > 16 * 1024 * 1024) throw new Error('User data exceeds the supported size.')
            store.put(next, 'current')
            if ((request.recoveryReason && previous) || request.migration) {
              const backups = store.get('recovery')
              backups.onsuccess = () => {
                const entries: Recovery[] = backups.result ?? []
                const entry = { reason: request.migration ? 'legacy-migration' : 'import', snapshot: previous ?? next }
                const all = [entry, ...entries]
                store.put([...all.filter((item) => item.reason === 'legacy-migration'), ...all.filter((item) => item.reason === 'import').slice(0, 5)], 'recovery')
              }
            }
          } catch (error) { failure = error; transaction.abort() }
        }
        transaction.oncomplete = () => { db.close(); resolve(next) }
        transaction.onabort = () => { db.close(); reject(failure ?? transaction.error ?? new Error('User data was not saved.')) }
      })
    },
  }
}
