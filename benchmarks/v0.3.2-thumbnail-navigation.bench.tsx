/** @vitest-environment jsdom */

import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { bench, describe } from 'vitest'
import { VirtualizedMediaTiles } from '../packages/app/src/features/explorer/components/VirtualizedMediaTiles'
import type { MediaAsset } from '../packages/app/src/features/media/store/mediaStore'
import {
  acquireThumbnailResource,
  clearThumbnailResourceCache,
} from '../packages/app/src/features/media/services/thumbnailResourceCache'
import { useSettingsStore } from '../packages/app/src/features/settings/store/settingsStore'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
Object.defineProperties(HTMLElement.prototype, {
  clientWidth: { configurable: true, get: () => 1_184 },
  clientHeight: { configurable: true, get: () => 900 },
})
HTMLElement.prototype.getBoundingClientRect = () => ({
  x: 0,
  y: 100,
  top: 100,
  left: 0,
  right: 1_184,
  bottom: 1_000,
  width: 1_184,
  height: 900,
  toJSON: () => ({}),
})

describe('v0.3.2 thumbnail navigation', () => {
  for (const librarySize of [2_500, 5_000]) {
    bench(`${librarySize.toLocaleString()}-video collection grid`, async () => {
      const assets = createAssets(librarySize)
      const container = document.createElement('div')
      container.id = 'void-main-scroll'
      document.body.append(container)
      const root = createRoot(container)
      useSettingsStore.setState({ thumbnailPriority: 'paused' })

      await act(async () => {
        root.render(
          <VirtualizedMediaTiles
            assets={assets}
            queueIds={assets.map((asset) => asset.id)}
            minimumTileWidth={240}
          />,
        )
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      const mountedTiles = container.querySelectorAll('.media-tile').length
      if (mountedTiles === 0 || mountedTiles >= 100) {
        throw new Error(`Collection mounted ${mountedTiles} tiles for a ${librarySize}-video fixture.`)
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

  bench('Explorer → Collection thumbnail reuse', async () => {
    const originalCreateObjectUrl = URL.createObjectURL
    const originalRevokeObjectUrl = URL.revokeObjectURL
    URL.createObjectURL = (blob) => `blob:benchmark:${blob.size}:${Math.random()}`
    URL.revokeObjectURL = () => undefined
    let persistentReads = 0
    const load = async () => {
      persistentReads += 1
      return new Blob(['thumbnail'])
    }

    try {
      const explorerLeases = Array.from({ length: 100 }, (_, index) =>
        acquireThumbnailResource(`thumbnail-${index}`, load))
      await Promise.all(explorerLeases.map((lease) => lease.url))
      explorerLeases.forEach((lease) => lease.release())

      const collectionLeases = Array.from({ length: 100 }, (_, index) =>
        acquireThumbnailResource(`thumbnail-${index}`, load))
      await Promise.all(collectionLeases.map((lease) => lease.url))
      collectionLeases.forEach((lease) => lease.release())

      if (persistentReads !== 100) {
        throw new Error(`Expected 100 persistent reads across both views; received ${persistentReads}.`)
      }
    } finally {
      clearThumbnailResourceCache()
      URL.createObjectURL = originalCreateObjectUrl
      URL.revokeObjectURL = originalRevokeObjectUrl
    }
  }, {
    iterations: 1,
    time: 0,
    warmupIterations: 0,
    warmupTime: 0,
  })
})

function createAssets(count: number): MediaAsset[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `library/clip-${index}.mp4`,
    libraryId: 'library',
    rootName: 'Videos',
    name: `clip-${index}.mp4`,
    extension: '.mp4',
    pathParts: [],
    source: { kind: 'desktop-path', absolutePath: `C:\\Videos\\clip-${index}.mp4` },
    size: index,
    lastModified: index,
    thumbnailStatus: 'idle',
  }))
}
