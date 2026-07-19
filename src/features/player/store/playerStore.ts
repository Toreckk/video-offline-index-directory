import { create } from 'zustand'
import type { PlaybackOrder, RepeatMode } from '../../settings/store/settingsStore'

export type PlaybackAdvance = 'advanced' | 'replay' | 'stopped'

type PlayerState = {
  selectedAssetId: string | null
  queueIds: string[]
  historyIds: string[]
  historyIndex: number
  smartRemainingIds: string[]
  playedInCycle: number
}

type PlayerActions = {
  openPlayer: (assetId: string, queueIds: string[]) => void
  closePlayer: () => void
  selectNext: (order?: PlaybackOrder) => void
  selectPrevious: (order?: PlaybackOrder) => void
  advanceAfterCompletion: (order: PlaybackOrder, repeatMode: RepeatMode) => PlaybackAdvance
  resetOrderCycle: () => void
}

type PlayerStore = PlayerState & PlayerActions

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  selectedAssetId: null,
  queueIds: [],
  historyIds: [],
  historyIndex: -1,
  smartRemainingIds: [],
  playedInCycle: 0,
  openPlayer: (selectedAssetId, queueIds) => {
    const normalizedQueue = [...new Set(queueIds)]
    const scopedQueue = normalizedQueue.includes(selectedAssetId)
      ? normalizedQueue
      : [selectedAssetId, ...normalizedQueue]
    set({
      selectedAssetId,
      queueIds: scopedQueue,
      historyIds: [selectedAssetId],
      historyIndex: 0,
      smartRemainingIds: scopedQueue.filter((id) => id !== selectedAssetId),
      playedInCycle: 1,
    })
  },
  closePlayer: () => set({ selectedAssetId: null }),
  selectNext: (order = 'displayed') => {
    moveNext(get(), order, false, 'all', set)
  },
  selectPrevious: (order = 'displayed') => {
    movePrevious(get(), order, set)
  },
  advanceAfterCompletion: (order, repeatMode) => {
    if (repeatMode === 'one') return 'replay'
    return moveNext(get(), order, true, repeatMode, set)
  },
  resetOrderCycle: () => {
    const { selectedAssetId, queueIds } = get()
    if (!selectedAssetId) return
    set({
      historyIds: [selectedAssetId],
      historyIndex: 0,
      smartRemainingIds: queueIds.filter((id) => id !== selectedAssetId),
      playedInCycle: 1,
    })
  },
}))

function moveNext(
  state: PlayerState,
  order: PlaybackOrder,
  automatic: boolean,
  repeatMode: RepeatMode,
  set: (state: Partial<PlayerState>) => void,
): PlaybackAdvance {
  const { selectedAssetId, queueIds } = state
  if (!selectedAssetId || queueIds.length === 0) return 'stopped'

  if (state.historyIndex < state.historyIds.length - 1) {
    const nextIndex = state.historyIndex + 1
    const nextId = state.historyIds[nextIndex]
    if (!nextId) return 'stopped'
    set({ selectedAssetId: nextId, historyIndex: nextIndex })
    return nextId === selectedAssetId ? 'replay' : 'advanced'
  }

  if (queueIds.length === 1) {
    return automatic && repeatMode === 'off' ? 'stopped' : 'replay'
  }

  if (order === 'displayed') {
    const currentIndex = queueIds.indexOf(selectedAssetId)
    if (currentIndex < 0) return 'stopped'
    const isAtEnd = currentIndex === queueIds.length - 1
    if (isAtEnd && automatic && repeatMode === 'off') return 'stopped'
    const nextId = queueIds[(currentIndex + 1) % queueIds.length]
    return appendHistory(state, nextId, set)
  }

  if (order === 'shuffle') {
    if (automatic && state.playedInCycle >= queueIds.length && repeatMode === 'off') {
      return 'stopped'
    }
    const choices = queueIds.filter((id) => id !== selectedAssetId)
    const nextId = pickRandom(choices)
    const startsNewCycle = state.playedInCycle >= queueIds.length
    return appendHistory(state, nextId, set, {
      playedInCycle: startsNewCycle ? 1 : state.playedInCycle + 1,
    })
  }

  let remainingIds = state.smartRemainingIds
  if (remainingIds.length === 0) {
    if (automatic && repeatMode === 'off') return 'stopped'
    remainingIds = queueIds.filter((id) => id !== selectedAssetId)
  }
  const nextId = pickRandom(remainingIds)
  return appendHistory(state, nextId, set, {
    smartRemainingIds: remainingIds.filter((id) => id !== nextId),
    playedInCycle: state.smartRemainingIds.length === 0 ? 1 : state.playedInCycle + 1,
  })
}

function movePrevious(
  state: PlayerState,
  order: PlaybackOrder,
  set: (state: Partial<PlayerState>) => void,
) {
  const { selectedAssetId, queueIds } = state
  if (!selectedAssetId || queueIds.length < 2) return
  if (state.historyIndex > 0) {
    const previousIndex = state.historyIndex - 1
    const previousId = state.historyIds[previousIndex]
    if (previousId) set({ selectedAssetId: previousId, historyIndex: previousIndex })
    return
  }

  const previousId = order === 'displayed'
    ? queueIds[(queueIds.indexOf(selectedAssetId) - 1 + queueIds.length) % queueIds.length]
    : pickRandom(queueIds.filter((id) => id !== selectedAssetId))
  if (!previousId) return
  set({
    selectedAssetId: previousId,
    historyIds: [previousId, ...state.historyIds],
    historyIndex: 0,
  })
}

function appendHistory(
  state: PlayerState,
  nextId: string | undefined,
  set: (state: Partial<PlayerState>) => void,
  patch: Partial<PlayerState> = {},
): PlaybackAdvance {
  if (!nextId) return 'stopped'
  const historyIds = state.historyIds.slice(0, state.historyIndex + 1)
  historyIds.push(nextId)
  set({
    ...patch,
    selectedAssetId: nextId,
    historyIds,
    historyIndex: historyIds.length - 1,
  })
  return nextId === state.selectedAssetId ? 'replay' : 'advanced'
}

function pickRandom(ids: readonly string[]) {
  if (ids.length === 0) return undefined
  return ids[Math.floor(Math.random() * ids.length)]
}
