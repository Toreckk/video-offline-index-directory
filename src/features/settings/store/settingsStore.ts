import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { idbStateStorage } from '../../../shared/persistence/idbStateStorage'

export type PreviewDelay = 150 | 250 | 500
export type ThumbnailPriority = 'visible-first' | 'balanced' | 'paused'
export type SortOrder = 'modified-date' | 'name' | 'size' | 'play-count'
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
  defaultVolume: number
  defaultPlaybackRate: number
  libraryReadyNotificationSeconds: number
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
  defaultVolume: 0.3,
  defaultPlaybackRate: 1,
  libraryReadyNotificationSeconds: 10,
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
        defaultVolume: state.defaultVolume,
        defaultPlaybackRate: state.defaultPlaybackRate,
        libraryReadyNotificationSeconds: state.libraryReadyNotificationSeconds,
      }),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ isHydrated: true })
      },
    },
  ),
)
