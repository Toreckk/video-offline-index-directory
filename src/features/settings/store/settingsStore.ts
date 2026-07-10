import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { idbStateStorage } from '../../../shared/persistence/idbStateStorage'

export type PreviewDelay = 150 | 250 | 500
export type ThumbnailPriority = 'visible-first' | 'balanced' | 'paused'
export type SortOrder = 'modified-date' | 'name' | 'size'
export type TileDensity = 'compact' | 'comfortable' | 'large'

export type SettingsState = {
  autoplayHoverPreview: boolean
  previewDelayMs: PreviewDelay
  thumbnailPriority: ThumbnailPriority
  showFilenames: boolean
  reduceMotion: boolean
  defaultSortOrder: SortOrder
  restoreLastLibrary: boolean
  scanSubfolders: boolean
  tileDensity: TileDensity
  isHydrated: boolean
}

type PersistedSettings = Omit<SettingsState, 'isHydrated'>

type SettingsActions = {
  updateSetting: <Key extends keyof PersistedSettings>(
    key: Key,
    value: PersistedSettings[Key],
  ) => void
  resetSettings: () => void
}

export const DEFAULT_SETTINGS: PersistedSettings = {
  autoplayHoverPreview: true,
  previewDelayMs: 250,
  thumbnailPriority: 'visible-first',
  showFilenames: true,
  reduceMotion: false,
  defaultSortOrder: 'modified-date',
  restoreLastLibrary: true,
  scanSubfolders: true,
  tileDensity: 'comfortable',
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      isHydrated: false,
      updateSetting: (key, value) => set({ [key]: value }),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'void-settings-store',
      storage: createJSONStorage(() => idbStateStorage),
      partialize: (state) => ({
        autoplayHoverPreview: state.autoplayHoverPreview,
        previewDelayMs: state.previewDelayMs,
        thumbnailPriority: state.thumbnailPriority,
        showFilenames: state.showFilenames,
        reduceMotion: state.reduceMotion,
        defaultSortOrder: state.defaultSortOrder,
        restoreLastLibrary: state.restoreLastLibrary,
        scanSubfolders: state.scanSubfolders,
        tileDensity: state.tileDensity,
      }),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ isHydrated: true })
      },
    },
  ),
)
