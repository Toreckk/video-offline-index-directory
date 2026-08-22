import { beforeEach, describe, expect, it } from 'vitest'
import { type MediaAsset, useMediaStore } from './mediaStore'

describe('mediaStore', () => {
  beforeEach(() => {
    useMediaStore.setState({
      assetsById: {},
      orderedIds: [],
      searchQuery: '',
      folderFilter: null,
      activePreviewId: null,
    })
  })

  it('normalizes assets without duplicating order entries', () => {
    const asset = createAsset('one')
    useMediaStore.getState().addAssets([asset])
    useMediaStore.getState().addAssets([{ ...asset, size: 20 }])

    expect(useMediaStore.getState().orderedIds).toEqual(['one'])
    expect(useMediaStore.getState().assetsById.one?.size).toBe(20)
  })

  it('updates one asset without mutating the rest', () => {
    useMediaStore.getState().addAssets([createAsset('one'), createAsset('two')])
    useMediaStore.getState().updateAsset('one', { thumbnailStatus: 'ready' })

    expect(useMediaStore.getState().assetsById.one?.thumbnailStatus).toBe('ready')
    expect(useMediaStore.getState().assetsById.two?.thumbnailStatus).toBe('idle')
  })

  it('removes stale cached assets after a reconciliation scan', () => {
    useMediaStore.getState().addAssets([createAsset('one'), createAsset('stale')])
    useMediaStore.getState().retainAssets(['one'])
    expect(useMediaStore.getState().orderedIds).toEqual(['one'])
    expect(useMediaStore.getState().assetsById.stale).toBeUndefined()
  })

  it('atomically replaces assets without retaining stale enrichment fields', () => {
    useMediaStore.getState().addAssets([{ ...createAsset('one'), thumbnailStatus: 'ready', duration: 12 }])
    useMediaStore.getState().replaceAssets([createAsset('one'), createAsset('two')])

    expect(useMediaStore.getState().orderedIds).toEqual(['one', 'two'])
    expect(useMediaStore.getState().assetsById.one).toMatchObject({ thumbnailStatus: 'idle' })
    expect(useMediaStore.getState().assetsById.one?.duration).toBeUndefined()
  })
})

function createAsset(id: string): MediaAsset {
  return {
    id,
    libraryId: 'lib_test',
    rootName: 'Library',
    name: `${id}.mp4`,
    extension: '.mp4',
    pathParts: [],
    source: {
      kind: 'file-system-handle',
      handle: {} as FileSystemFileHandle,
    },
    size: 10,
    lastModified: 1,
    thumbnailStatus: 'idle',
  }
}
