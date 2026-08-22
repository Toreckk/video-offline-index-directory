import {
  del as deleteFromIndexedDb,
  get as getFromIndexedDb,
  set as setInIndexedDb,
} from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

export const idbStateStorage: StateStorage = {
  getItem: async (name) => (await getFromIndexedDb<string>(name)) ?? null,
  setItem: async (name, value) => setInIndexedDb(name, value),
  removeItem: async (name) => deleteFromIndexedDb(name),
}
