import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPlaybackProgress, usePlaybackStore } from './playbackStore'

vi.mock('idb-keyval', () => ({ get: vi.fn(async () => undefined), set: vi.fn(async () => undefined), del: vi.fn(async () => undefined) }))

describe('playbackStore', () => {
  beforeEach(() => usePlaybackStore.setState({ recordsByMediaId: {}, isHydrated: true }))

  it('persists resumable progress and marks content watched near completion', () => {
    usePlaybackStore.getState().updateProgress('one', 25, 100)
    expect(getPlaybackProgress(usePlaybackStore.getState().recordsByMediaId.one)).toBe(0.25)
    usePlaybackStore.getState().updateProgress('one', 91, 100)
    expect(usePlaybackStore.getState().recordsByMediaId.one).toMatchObject({ watched: true, positionSeconds: 0 })
  })

  it('records completions and supports explicit watched toggles', () => {
    usePlaybackStore.getState().recordCompletion('one', 120)
    expect(usePlaybackStore.getState().recordsByMediaId.one).toMatchObject({ watched: true, playCount: 1 })
    usePlaybackStore.getState().markWatched('one', false)
    expect(usePlaybackStore.getState().recordsByMediaId.one?.watched).toBe(false)
  })
})
