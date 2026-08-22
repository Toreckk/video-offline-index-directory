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

  it('merges duplicate watch history into a keeper without clearing sources', () => {
    usePlaybackStore.getState().recordCompletion('keeper', 100)
    usePlaybackStore.getState().recordCompletion('duplicate', 100)
    usePlaybackStore.getState().recordCompletion('duplicate', 100)

    usePlaybackStore.getState().mergePlaybackRecords('keeper', ['duplicate'])

    expect(usePlaybackStore.getState().recordsByMediaId.keeper).toMatchObject({ watched: true, playCount: 2 })
    expect(usePlaybackStore.getState().recordsByMediaId.duplicate).toMatchObject({ watched: true, playCount: 2 })

    usePlaybackStore.getState().mergePlaybackRecords('keeper', ['duplicate'])
    expect(usePlaybackStore.getState().recordsByMediaId.keeper?.playCount).toBe(2)
  })

  it('moves renamed-video playback without leaving history at the old id', () => {
    usePlaybackStore.getState().recordCompletion('old-path', 100)
    usePlaybackStore.getState().recordCompletion('old-path', 100)

    usePlaybackStore.getState().movePlaybackRecords('new-path', ['old-path'])

    expect(usePlaybackStore.getState().recordsByMediaId['new-path']).toMatchObject({
      watched: true,
      playCount: 2,
    })
    expect(usePlaybackStore.getState().recordsByMediaId['old-path']).toBeUndefined()
  })
})
