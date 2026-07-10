import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayerStore } from './playerStore'

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({ selectedAssetId: null, queueIds: [] })
  })

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
})
