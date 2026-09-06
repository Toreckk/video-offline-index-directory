import {
  del as deleteFromIndexedDb,
  get as getFromIndexedDb,
  set as setInIndexedDb,
} from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'
import { hasUserDataStarted, readUserRecord, writeUserRecord } from './userDataCoordinator'

export const idbStateStorage: StateStorage = {
  getItem: async (name) => hasUserDataStarted() ? readUserRecord(name) : (await getFromIndexedDb<string>(name)) ?? null,
  setItem: async (name, value) => {
    if (hasUserDataStarted()) writeUserRecord(name, value)
    else await setInIndexedDb(name, value)
  },
  removeItem: async (name) => {
    if (hasUserDataStarted()) throw new Error('Use the scoped data-recovery controls to remove durable metadata.')
    await deleteFromIndexedDb(name)
  },
}
