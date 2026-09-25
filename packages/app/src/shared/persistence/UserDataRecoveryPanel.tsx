import { useState } from 'react'
import type { UserDataSnapshot } from '@void/core'
import { commitUserDataImport, exportRecovery, retainedRecoverySnapshots } from './userDataCoordinator'
import { isRecord, MAX_BACKUP_BYTES, validateUserRecords } from './userDataValidation'

export function UserDataRecoveryPanel() {
  const [backups, setBackups] = useState<Array<{ reason: string; snapshot: UserDataSnapshot }>>([])
  const [preview, setPreview] = useState<Record<string, string> | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const select = (records: Record<string, string>) => {
    validateUserRecords(records)
    if (!Object.keys(records).length) throw new Error('This snapshot contains no saved data stores.')
    setPreview(records)
  }
  return <section className="space-y-3 border-t border-white/10 p-5" aria-label="Recovery snapshots">
    <h3 className="font-bold">Data recovery</h3>
    <p className="text-sm text-on-secondary">Recovery snapshots include saved library identity and settings when present. Restoring replaces the listed stores, keeps any unlisted stores, and restarts VOID. Source videos are never included or modified.</p>
    <div className="flex flex-wrap gap-3">
      <button className="border px-4 py-2" onClick={() => void exportRecovery()}>Export recovery data</button>
      <button className="border px-4 py-2" onClick={() => void retainedRecoverySnapshots().then(setBackups).catch((error: unknown) => setMessage(String(error)))}>Show retained snapshots</button>
      <label className="cursor-pointer border px-4 py-2">Preview recovery file<input type="file" accept=".json,application/json" className="sr-only" onChange={(event) => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
        void (async () => {
          if (file.size > MAX_BACKUP_BYTES * 8) throw new Error('Recovery export exceeds the supported size.')
          const text = await file.text()
          // Exports may contain several retained snapshots. Parse only within a fixed envelope.
          const value: unknown = text.length <= MAX_BACKUP_BYTES * 8 ? JSON.parse(text) : null
          if (!isRecord(value) || value.kind !== 'void-user-data-recovery' || value.schemaVersion !== 1) throw new Error('Not a supported VOID recovery export.')
          const snapshot = isRecord(value.snapshot) ? value.snapshot : null
          if (snapshot && snapshot.schemaVersion !== 1) throw new Error('This snapshot needs a different VOID version.')
          const records = snapshot?.records ?? value.legacy
          if (!isRecord(records) || !Object.values(records).every((entry) => typeof entry === 'string')) throw new Error('The recovery file contains no usable snapshot.')
          select(records as Record<string, string>)
          setMessage('Preview uses the durable snapshot or legacy data. Unsaved edits and raw damaged data are retained in the export for inspection, not applied automatically.')
        })().catch((error: unknown) => setMessage(String(error)))
      }} /></label>
    </div>
    {backups.map((backup, index) => <button className="block border px-4 py-2 text-left" key={`${backup.reason}:${backup.snapshot.revision}:${index}`} onClick={() => { try { select(backup.snapshot.records) } catch (error) { setMessage(String(error)) } }}>Preview {backup.reason}, revision {backup.snapshot.revision}</button>)}
    {preview && <div className="space-y-3 border border-primary/50 p-4">
      <p>Replace these saved stores: {Object.keys(preview).join(', ')}. A snapshot of the current data will be retained first.</p>
      <button disabled={busy} className="bg-primary px-4 py-2" onClick={() => {
        setBusy(true)
        void commitUserDataImport(preview, () => location.reload()).catch((error: unknown) => { setMessage(String(error)); setBusy(false) })
      }}>Restore and restart</button>
      <button disabled={busy} className="ml-3 border px-4 py-2" onClick={() => setPreview(null)}>Cancel</button>
    </div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>
}
