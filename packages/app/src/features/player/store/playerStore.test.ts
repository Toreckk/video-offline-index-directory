import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlayerStore } from './playerStore'

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({ selectedAssetId: null, queueIds: [], historyIds: [], historyIndex: -1, smartRemainingIds: [], playedInCycle: 0 })
  })

  afterEach(() => vi.restoreAllMocks())

  it('opens and closes a selected asset with its queue', () => {
    usePlayerStore.getState().openPlayer('two', ['one', 'two', 'three'])
    expect(usePlayerStore.getState().selectedAssetId).toBe('two')
    expect(usePlayerStore.getState().queueIds).toEqual(['one', 'two', 'three'])

    usePlayerStore.getState().closePlayer()
    expect(usePlayerStore.getState().selectedAssetId).toBeNull()
  })

  it('wraps previous and next navigation at queue edges', () => {
    usePlayerStore.getState().openPlayer('three', ['one', 'two', 'three'])
    usePlayerStore.getState().selectNext()
    expect(usePlayerStore.getState().selectedAssetId).toBe('one')

    usePlayerStore.getState().selectPrevious()
    expect(usePlayerStore.getState().selectedAssetId).toBe('three')
  })

  it('stops displayed autoplay at the queue edge unless repeat all is enabled', () => {
    usePlayerStore.getState().openPlayer('three', ['one', 'two', 'three'])
    expect(usePlayerStore.getState().advanceAfterCompletion('displayed', 'off')).toBe('stopped')
    expect(usePlayerStore.getState().selectedAssetId).toBe('three')

    expect(usePlayerStore.getState().advanceAfterCompletion('displayed', 'all')).toBe('advanced')
    expect(usePlayerStore.getState().selectedAssetId).toBe('one')
  })

  it('smart shuffle does not repeat until its scoped queue is exhausted', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    usePlayerStore.getState().openPlayer('one', ['one', 'two', 'three'])

    expect(usePlayerStore.getState().advanceAfterCompletion('smart-shuffle', 'off')).toBe('advanced')
    expect(usePlayerStore.getState().selectedAssetId).toBe('two')
    expect(usePlayerStore.getState().advanceAfterCompletion('smart-shuffle', 'off')).toBe('advanced')
    expect(usePlayerStore.getState().selectedAssetId).toBe('three')
    expect(usePlayerStore.getState().advanceAfterCompletion('smart-shuffle', 'off')).toBe('stopped')
  })

  it('replays the current video in repeat-one mode', () => {
    usePlayerStore.getState().openPlayer('one', ['one', 'two'])
    expect(usePlayerStore.getState().advanceAfterCompletion('shuffle', 'one')).toBe('replay')
    expect(usePlayerStore.getState().selectedAssetId).toBe('one')
  })
})
