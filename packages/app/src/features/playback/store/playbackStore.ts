import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { idbStateStorage } from '../../../shared/persistence/idbStateStorage'
import type { PlaybackData, PlaybackRecord } from '../model/playbackTypes'

const WATCHED_THRESHOLD = 0.9

type PlaybackState = PlaybackData & {
  isHydrated: boolean
}

type PlaybackActions = {
  updateProgress: (mediaId: string, positionSeconds: number, durationSeconds: number) => void
  markWatched: (mediaId: string, watched: boolean) => void
  recordCompletion: (mediaId: string, durationSeconds: number) => void
  clearProgress: (mediaId: string) => void
  mergePlaybackRecords: (targetMediaId: string, sourceMediaIds: readonly string[]) => void
}

export const usePlaybackStore = create<PlaybackState & PlaybackActions>()(
  persist(
    (set) => ({
      recordsByMediaId: {},
      isHydrated: false,
      updateProgress: (mediaId, positionSeconds, durationSeconds) =>
        set((state) => {
          if (!Number.isFinite(positionSeconds) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return state
          const previous = state.recordsByMediaId[mediaId]
          const watched = previous?.watched || positionSeconds / durationSeconds >= WATCHED_THRESHOLD
          const record: PlaybackRecord = {
            positionSeconds: watched ? 0 : Math.max(0, Math.min(positionSeconds, durationSeconds)),
            durationSeconds,
            watched,
            lastPlayedAt: Date.now(),
            completedAt: watched ? previous?.completedAt ?? Date.now() : previous?.completedAt,
            playCount: previous?.playCount ?? 0,
          }
          return { recordsByMediaId: { ...state.recordsByMediaId, [mediaId]: record } }
        }),
      markWatched: (mediaId, watched) =>
        set((state) => {
          const previous = state.recordsByMediaId[mediaId]
          const record: PlaybackRecord = {
            positionSeconds: 0,
            durationSeconds: previous?.durationSeconds ?? 0,
            watched,
            lastPlayedAt: previous?.lastPlayedAt ?? Date.now(),
            completedAt: watched ? Date.now() : undefined,
            playCount: previous?.playCount ?? 0,
          }
          return { recordsByMediaId: { ...state.recordsByMediaId, [mediaId]: record } }
        }),
      recordCompletion: (mediaId, durationSeconds) =>
        set((state) => {
          const previous = state.recordsByMediaId[mediaId]
          const now = Date.now()
          return {
            recordsByMediaId: {
              ...state.recordsByMediaId,
              [mediaId]: {
                positionSeconds: 0,
                durationSeconds,
                watched: true,
                lastPlayedAt: now,
                completedAt: now,
                playCount: (previous?.playCount ?? 0) + 1,
              },
            },
          }
        }),
      clearProgress: (mediaId) =>
        set((state) => {
          const previous = state.recordsByMediaId[mediaId]
          if (!previous) return state
          return {
            recordsByMediaId: {
              ...state.recordsByMediaId,
              [mediaId]: { ...previous, positionSeconds: 0 },
            },
          }
        }),
      mergePlaybackRecords: (targetMediaId, sourceMediaIds) =>
        set((state) => {
          const records = [...new Set([targetMediaId, ...sourceMediaIds])]
            .flatMap((mediaId) => state.recordsByMediaId[mediaId] ? [state.recordsByMediaId[mediaId]] : [])
          if (records.length === 0) return state
          const watched = records.some((record) => record.watched)
          const mostAdvanced = records.reduce((best, record) => {
            const progress = record.durationSeconds > 0 ? record.positionSeconds / record.durationSeconds : 0
            const bestProgress = best.durationSeconds > 0 ? best.positionSeconds / best.durationSeconds : 0
            return progress > bestProgress ? record : best
          })
          const latest = (values: (number | undefined)[]) => {
            const present = values.filter((value): value is number => value !== undefined)
            return present.length ? Math.max(...present) : undefined
          }
          return {
            recordsByMediaId: {
              ...state.recordsByMediaId,
              [targetMediaId]: {
                positionSeconds: watched ? 0 : mostAdvanced.positionSeconds,
                durationSeconds: mostAdvanced.durationSeconds,
                watched,
                lastPlayedAt: latest(records.map((record) => record.lastPlayedAt)) ?? Date.now(),
                completedAt: latest(records.map((record) => record.completedAt)),
                playCount: Math.max(...records.map((record) => record.playCount)),
              },
            },
          }
        }),
    }),
    {
      name: 'void-playback-store',
      storage: createJSONStorage(() => idbStateStorage),
      partialize: (state) => ({ recordsByMediaId: state.recordsByMediaId }),
      version: 1,
      onRehydrateStorage: () => () => usePlaybackStore.setState({ isHydrated: true }),
    },
  ),
)

export function getPlaybackProgress(record: PlaybackRecord | undefined) {
  if (!record || record.watched || record.durationSeconds <= 0) return 0
  return Math.max(0, Math.min(1, record.positionSeconds / record.durationSeconds))
}
