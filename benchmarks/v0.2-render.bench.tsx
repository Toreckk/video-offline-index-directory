/** @vitest-environment jsdom */

import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { bench, describe } from 'vitest'
import { MediaGrid } from '../packages/app/src/features/explorer/components/MediaGrid'
import { useAnnotationStore } from '../packages/app/src/features/annotations/store/annotationStore'
import { useMediaStore, type MediaAsset } from '../packages/app/src/features/media/store/mediaStore'
import { usePlaybackStore } from '../packages/app/src/features/playback/store/playbackStore'
import { useSettingsStore } from '../packages/app/src/features/settings/store/settingsStore'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
Object.defineProperties(HTMLElement.prototype, {
  clientWidth: { configurable: true, get: () => 1_184 },
  clientHeight: { configurable: true, get: () => 900 },
  offsetTop: { configurable: true, get: () => 100 },
})
HTMLElement.prototype.getBoundingClientRect = () => ({
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 1_184,
  bottom: 900,
  width: 1_184,
  height: 900,
  toJSON: () => ({}),
})

describe('Explorer React mount', () => {
  for (const librarySize of [2_500, 5_000]) {
    bench(`${librarySize.toLocaleString()} media tiles`, async () => {
      await act(async () => seedStores(librarySize))
      const container = document.createElement('div')
      container.id = 'void-main-scroll'
      document.body.append(container)
      const root = createRoot(container)
      await act(async () => {
        root.render(<MediaGrid />)
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      const mountedTiles = container.querySelectorAll('.media-tile').length
      if (mountedTiles === 0 || mountedTiles >= librarySize) {
        throw new Error(`Explorer mounted ${mountedTiles} tiles for a ${librarySize}-video fixture.`)
      }
      await act(async () => root.unmount())
      container.remove()
    }, {
      iterations: 1,
      time: 0,
      warmupIterations: 0,
      warmupTime: 0,
    })
  }
})

function seedStores(count: number) {
  const assets = createAssets(count)
  const tagsById = Object.fromEntries(Array.from({ length: 300 }, (_, index) => [
    `tag-${index}`,
    {
      id: `tag-${index}`,
      name: `Tag ${index}`,
      color: '#A78BFA' as const,
      createdAt: index,
    },
  ]))
  const annotationsByMediaId = Object.fromEntries(assets.map((asset, index) => [
    asset.id,
    {
      favorite: index % 20 === 0,
      tagIds: [`tag-${index % 300}`, `tag-${(index + 17) % 300}`],
      updatedAt: index,
    },
  ]))

  useMediaStore.getState().replaceAssets(assets)
  useAnnotationStore.setState({
    tagsById,
    orderedTagIds: Object.keys(tagsById),
    annotationsByMediaId,
    favoritesOnly: false,
    untaggedOnly: false,
    selectedTagIds: [],
    favoriteTagIds: [],
    bulkTagId: null,
    bulkSelectedMediaIds: [],
  })
  usePlaybackStore.setState({ recordsByMediaId: {} })
  useSettingsStore.setState({
    defaultSortOrder: 'modified-date',
    showFilenames: true,
    thumbnailPriority: 'paused',
    tileDensity: 'comfortable',
  })
}

function createAssets(count: number): MediaAsset[] {
  return Array.from({ length: count }, (_, index) => {
    const name = `clip-${String(index).padStart(5, '0')}.mp4`
    return {
      id: `library/folder-${index % 50}/${name}`,
      libraryId: 'library',
      rootName: 'Videos',
      name,
      extension: '.mp4',
      pathParts: [`folder-${index % 50}`],
      source: { kind: 'desktop-path', absolutePath: `C:\\Videos\\folder-${index % 50}\\${name}` },
      size: 1_000_000 + index,
      lastModified: 1_700_000_000_000 + index,
      thumbnailStatus: 'idle',
      duration: 30 + (index % 300),
      width: 1920,
      height: 1080,
    }
  })
}
