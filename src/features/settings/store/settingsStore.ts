import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { idbStateStorage } from '../../../shared/persistence/idbStateStorage'

export type PreviewDelay = 150 | 250 | 500
export type ThumbnailPriority = 'visible-first' | 'balanced' | 'paused'
export type SortOrder = 'modified-date' | 'name' | 'size' | 'play-count'
export type TileDensity = 'compact' | 'comfortable' | 'large'
export type PlaybackOrder = 'displayed' | 'shuffle' | 'smart-shuffle'
export type RepeatMode = 'off' | 'all' | 'one'

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
  playbackOrder: PlaybackOrder
  repeatMode: RepeatMode
  libraryReadyNotificationSeconds: number
  isHydrated: boolean
}

type SettingsValues = Omit<SettingsState, 'isHydrated'>
type PersistedSettings = Omit<SettingsValues, 'playbackOrder' | 'repeatMode'>

type SettingsActions = {
  updateSetting: <Key extends keyof SettingsValues>(
    key: Key,
    value: SettingsValues[Key],
  ) => void
  resetSettings: () => void
}

export const DEFAULT_SETTINGS: SettingsValues = {
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
  playbackOrder: 'displayed',
  repeatMode: 'one',
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
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<PersistedSettings>),
        // Playback choices are intentionally page-session settings. Keep changes
        // while VOID is open, but never restore them on the next launch.
        playbackOrder: DEFAULT_SETTINGS.playbackOrder,
        repeatMode: DEFAULT_SETTINGS.repeatMode,
      }),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ isHydrated: true })
      },
    },
  ),
)
