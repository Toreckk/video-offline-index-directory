import { getMany } from 'idb-keyval'
import { getVoidPlatform, type NativeCatalog, type UserDataPort, type UserDataSnapshot } from '@void/core'
import { STORE_VERSIONS, validateUserRecords } from './userDataValidation'

type PersistenceStatus = { phase: 'idle' | 'loading' | 'migration' | 'ready' | 'error'; message?: string; records?: Record<string, string> }
let status: PersistenceStatus = { phase: 'idle' }
let snapshot: UserDataSnapshot | null = null
let port: UserDataPort | undefined
let pending: Record<string, string> = {}
let processing: Promise<void> | null = null
let startup: Promise<void> | null = null
let suspendWrites = false
let legacyRecords: Record<string, string> | null = null
let concurrentEdit = false
const listeners = new Set<() => void>()
export const getPersistenceStatus = () => status
export const subscribePersistence = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
const report = (next: PersistenceStatus) => { status = next; for (const listener of listeners) listener() }
export function reportPersistenceFailure(error: unknown) { report({ phase: 'error', message: error instanceof Error ? error.message : String(error) }) }

export function initializeUserData() {
  startup ??= (async () => {
    report({ phase: 'loading' })
    port = getVoidPlatform().userData
    if (!port) throw new Error('This platform does not provide durable user-data storage.')
    snapshot = await port.load()
    if (snapshot) {
      if (snapshot.schemaVersion !== 1 || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) throw new Error('Unsupported or damaged user-data schema. No data was changed.')
      validateUserRecords(snapshot.records)
      report({ phase: 'ready' })
      return
    }
    // Only this WebView/browser origin can read these keys. Never enumerate other profiles.
    const names = Object.keys(STORE_VERSIONS)
    const values = await getMany<string | undefined>(names)
    const records = Object.fromEntries(names.flatMap((name, index) => values[index] === undefined ? [] : [[name, values[index]!]]))
    legacyRecords = records
    validateUserRecords(records)
    if (Object.keys(records).length) { report({ phase: 'migration', records }); return }
    snapshot = await port.commit({ expectedRevision: 0, records: {} })
    report({ phase: 'ready' })
  })().catch(reportPersistenceFailure)
  return startup
}

export async function acceptLegacyMigration() {
  if (status.phase !== 'migration' || !status.records || !port) return
  const records = status.records
  report({ phase: 'loading' })
  try {
    snapshot = await port.commit({ expectedRevision: 0, records, migration: { id: 'legacy-stores-to-user-data-v1', origin: location.origin, createdAt: Date.now() } })
    report({ phase: 'ready' })
  } catch (error) { reportPersistenceFailure(error) }
}

export function readUserRecord(name: string) { return snapshot?.records[name] ?? null }
export function hasUserDataStarted() { return status.phase !== 'idle' }
export function writeUserRecord(name: string, value: string) {
  if (suspendWrites || status.phase === 'idle' || status.phase === 'migration' || (status.phase === 'loading' && !snapshot)) return
  if ((pending[name] ?? snapshot?.records[name]) === value) return
  pending[name] = value
  if (status.phase === 'ready') void flushUserData().catch(() => undefined)
}

export async function flushUserData(): Promise<void> {
  if (processing) { await processing; if (Object.keys(pending).length) return flushUserData(); return }
  if (status.phase !== 'ready' || !snapshot || !port) throw new Error(status.message ?? 'User data is not ready to save.')
  const run = async () => {
    while (Object.keys(pending).length) {
      const batch = pending
      pending = {}
      try {
        const records = { ...snapshot!.records, ...batch }
        validateUserRecords(records)
        snapshot = await port!.commit({ expectedRevision: snapshot!.revision, records })
      } catch (error) {
        pending = { ...batch, ...pending }
        reportPersistenceFailure(error)
        throw error
      }
    }
  }
  processing = run()
  try { await processing } finally { processing = null }
}

export async function retryUserData() {
  if (concurrentEdit) { reportPersistenceFailure(new Error('Export concurrent unsaved edits, then reload the committed data. Automatic replay could overwrite an import or rename.')); return }
  if (!snapshot) { startup = null; return initializeUserData() }
  // Reload is deliberate on a conflicting revision; do not silently replay stale edits.
  try {
    const current = await port!.load()
    if (current?.revision !== snapshot.revision) throw new Error('Another window saved newer data. Export unsaved changes, then reload to continue safely.')
    report({ phase: 'ready' })
    await flushUserData()
  } catch (error) { reportPersistenceFailure(error) }
}

export function userDataExport() {
  return { kind: 'void-user-data-recovery', schemaVersion: 1, exportedAt: new Date().toISOString(), snapshot, pending, legacy: legacyRecords }
}
export async function retainedRecoverySnapshots() { return await port?.recovery() ?? [] }

/** Commit the prepared import once, then publish its state to the in-memory stores. */
export async function commitUserDataImport(records: Record<string, string>, publish: () => void) {
  await flushUserData()
  if (status.phase !== 'ready') throw new Error('Another user-data transaction is in progress.')
  validateUserRecords(records)
  report({ phase: 'loading' })
  try {
    snapshot = await port!.commit({ expectedRevision: snapshot!.revision, records: { ...snapshot!.records, ...records }, recoveryReason: 'import' })
    rejectConcurrentEdits()
    suspendWrites = true
    try { publish() } finally { suspendWrites = false }
    report({ phase: 'ready' })
  } catch (error) { reportPersistenceFailure(error); throw error }
}

export function persistedRecords() { return { ...snapshot?.records } }

/** Capture personal data after pending edits are durable and save a rename with its catalog. */
export async function commitCatalogReconciliation(catalog: NativeCatalog, prepare: (records: Record<string, string>) => { records: Record<string, string>; publish: () => void }) {
  await flushUserData()
  if (status.phase !== 'ready') throw new Error('Another user-data transaction is in progress.')
  const prepared = prepare(persistedRecords())
  validateUserRecords(prepared.records)
  report({ phase: 'loading' })
  try {
    snapshot = await port!.commit({ expectedRevision: snapshot!.revision, records: prepared.records, catalog })
    rejectConcurrentEdits()
    suspendWrites = true
    try { prepared.publish() } finally { suspendWrites = false }
    report({ phase: 'ready' })
  } catch (error) { reportPersistenceFailure(error); throw error }
}

function rejectConcurrentEdits() {
  if (!Object.keys(pending).length) return
  concurrentEdit = true
  throw new Error('The transaction was saved, but another edit finished while it was running. Export recovery data to retain those unsaved edits, then reload the committed data.')
}

export async function exportRecovery() {
  const recovery = await retainedRecoverySnapshots().catch(() => [])
  const raw = await getVoidPlatform().userData?.raw?.().catch(() => null)
  const blob = new Blob([JSON.stringify({ ...userDataExport(), recovery, raw })], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `void-recovery-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
