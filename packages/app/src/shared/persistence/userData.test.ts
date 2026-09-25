/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBrowserUserDataPort } from '../../../../platform-web/src/userData'
import { parseBoundedJson, validateUserRecords } from './userDataValidation'

const legacy = vi.hoisted(() => new Map<string, string>())
vi.mock('idb-keyval', () => ({ getMany: async (keys: string[]) => keys.map((key) => legacy.get(key)) }))
const records = { 'void-settings-store': JSON.stringify({ state: { defaultVolume: 0.4 }, version: 0 }) }

describe('transactional browser adapter', () => {
  it('rejects stale writers and keeps an atomic pre-import snapshot', async () => {
    const port = createBrowserUserDataPort(`void-test-${crypto.randomUUID()}`)
    expect(await port.load()).toBeNull()
    const initial = await port.commit({ expectedRevision: 0, records, migration: { id: 'test', origin: 'test-origin', createdAt: 1 } })
    await expect(port.commit({ expectedRevision: 0, records: {} })).rejects.toThrow('another window')
    expect(await port.load()).toEqual(initial)
    const next = await port.commit({ expectedRevision: 1, records: {}, recoveryReason: 'import' })
    expect(next.migration).toEqual(initial.migration)
    expect((await port.recovery()).map((entry) => entry.reason)).toEqual(['legacy-migration', 'import'])
    await expect(port.commit({ expectedRevision: 2, records, migration: initial.migration! })).rejects.toThrow('cannot replace')
    expect((await port.load())?.revision).toBe(2)
  })

  it('only one concurrent writer can commit the same revision', async () => {
    const name = `void-test-${crypto.randomUUID()}`
    const a = createBrowserUserDataPort(name)
    const b = createBrowserUserDataPort(name)
    const results = await Promise.allSettled([a.commit({ expectedRevision: 0, records }), b.commit({ expectedRevision: 0, records: {} })])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect((await a.load())?.revision).toBe(1)
  })
})

describe('migration and durability coordinator', () => {
  beforeEach(() => { vi.resetModules(); legacy.clear() })
  const setup = async () => {
    const { installVoidPlatform } = await import('@void/core')
    const port = createBrowserUserDataPort(`void-test-${crypto.randomUUID()}`)
    installVoidPlatform({ kind: 'desktop', capabilities: { persistentLibraryAccess: true, nativeCatalog: true, diskThumbnailCache: true, revealInFileManager: true, fullFileHashing: true, nativeMediaProbe: true, recycleBinCleanup: true }, userData: port })
    return { port, coordinator: await import('./userDataCoordinator') }
  }
  it('previews legacy state and never deletes it during migration', async () => {
    legacy.set('void-settings-store', records['void-settings-store'])
    const { port, coordinator } = await setup()
    await coordinator.initializeUserData()
    expect(coordinator.getPersistenceStatus().phase).toBe('migration')
    expect(await port.load()).toBeNull()
    await coordinator.acceptLegacyMigration()
    expect(coordinator.getPersistenceStatus().phase).toBe('ready')
    expect((await port.load())?.records).toEqual(records)
    expect(legacy.get('void-settings-store')).toBe(records['void-settings-store'])
    await coordinator.acceptLegacyMigration()
    expect((await port.load())?.revision).toBe(1)
  })
  it('native data is authoritative when older legacy records remain', async () => {
    legacy.set('void-settings-store', 'invalid stale legacy')
    const { port, coordinator } = await setup()
    await port.commit({ expectedRevision: 0, records })
    await coordinator.initializeUserData()
    expect(coordinator.getPersistenceStatus().phase).toBe('ready')
    expect(coordinator.readUserRecord('void-settings-store')).toBe(records['void-settings-store'])
  })
  it('retains failed writes for export and retry and does not publish a failed import', async () => {
    const { port, coordinator } = await setup()
    await coordinator.initializeUserData()
    const commit = vi.spyOn(port, 'commit').mockRejectedValueOnce(new Error('disk unavailable'))
    coordinator.writeUserRecord('void-settings-store', records['void-settings-store'])
    await expect(coordinator.flushUserData()).rejects.toThrow('disk unavailable')
    expect(coordinator.getPersistenceStatus().phase).toBe('error')
    expect(coordinator.userDataExport().pending).toEqual(records)
    await coordinator.retryUserData()
    expect(coordinator.getPersistenceStatus().phase).toBe('ready')
    expect((await port.load())?.records).toEqual(records)
    commit.mockRejectedValueOnce(new Error('transaction rolled back'))
    const publish = vi.fn()
    await expect(coordinator.commitUserDataImport({ 'void-settings-store': JSON.stringify({ state: {}, version: 0 }) }, publish)).rejects.toThrow('rolled back')
    expect(publish).not.toHaveBeenCalled()
    expect((await port.load())?.records).toEqual(records)
  })
  it('rejects unknown schemas before any migration commit', async () => {
    legacy.set('void-settings-store', JSON.stringify({ state: {}, version: 99 }))
    const { port, coordinator } = await setup()
    await coordinator.initializeUserData()
    expect(coordinator.getPersistenceStatus().phase).toBe('error')
    expect(await port.load()).toBeNull()
    expect(coordinator.userDataExport().legacy).not.toBeNull()
  })
  it('retains a concurrent edit for recovery instead of replaying it over an import', async () => {
    const { port, coordinator } = await setup()
    await coordinator.initializeUserData()
    const originalCommit = port.commit.bind(port)
    let release!: () => void, entered!: () => void
    const started = new Promise<void>((resolve) => { entered = resolve })
    const gate = new Promise<void>((resolve) => { release = resolve })
    vi.spyOn(port, 'commit').mockImplementationOnce(async (request) => { entered(); await gate; return originalCommit(request) })
    const publish = vi.fn()
    const transaction = coordinator.commitUserDataImport(records, publish)
    await started
    const concurrent = JSON.stringify({ version: 0, state: { defaultVolume: 0.9 } })
    coordinator.writeUserRecord('void-settings-store', concurrent)
    release()
    await expect(transaction).rejects.toThrow('another edit')
    expect(publish).not.toHaveBeenCalled()
    expect((await port.load())?.records).toEqual(records)
    expect(coordinator.userDataExport().pending['void-settings-store']).toBe(concurrent)
    await coordinator.retryUserData()
    expect(coordinator.getPersistenceStatus().phase).toBe('error')
    expect((await port.load())?.records).toEqual(records)
  })
})

it('bounds JSON nesting and rejects dangerous keys and incompatible state versions', () => {
  expect(() => parseBoundedJson('{"__proto__":{}}')).toThrow('unsafe')
  expect(() => parseBoundedJson('['.repeat(42) + '0' + ']'.repeat(42))).toThrow('depth')
  expect(() => validateUserRecords({ 'void-playback-store': '{"state":{},"version":0}' })).toThrow('No migration')
  expect(() => validateUserRecords({ 'void-settings-store': '{"state":[],"version":0}' })).toThrow('schema')
})

it('rejects malformed persisted values before hydration can replace actions or crash views', () => {
  const check = (name: string, state: unknown, version: number) => validateUserRecords({ [name]: JSON.stringify({ state, version }) })
  expect(() => check('void-settings-store', { updateSetting: 'overridden action' }, 0)).toThrow('field')
  expect(() => check('void-settings-store', { defaultVolume: 'loud' }, 0)).toThrow('defaultVolume')
  expect(() => check('void-annotations-store', { annotationsByMediaId: { clip: { favorite: true, tagIds: null, updatedAt: 1 } } }, 1)).toThrow('annotationsByMediaId')
  expect(() => check('void-collections-store', { collectionsById: { c: { id: 'c', name: 'Broken', createdAt: 1, updatedAt: 1, rules: { root: { kind: 'group', children: null } } } } }, 2)).toThrow('collection rule')
})
