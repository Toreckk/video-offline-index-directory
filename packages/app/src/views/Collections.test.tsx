/** @vitest-environment jsdom */

import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnnotationStore } from '../features/annotations/store/annotationStore'
import { useCollectionStore } from '../features/collections/store/collectionStore'
import type { MediaAsset } from '../features/media/store/mediaStore'
import { useMediaStore } from '../features/media/store/mediaStore'
import { usePlaybackStore } from '../features/playback/store/playbackStore'
import { useSettingsStore } from '../features/settings/store/settingsStore'
import Collections from './Collections'

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
  del: vi.fn(async () => undefined),
  keys: vi.fn(async () => []),
}))

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

describe('Collections virtualization', () => {
  beforeEach(() => {
    useMediaStore.getState().replaceAssets(createAssets(5_000))
    useCollectionStore.setState({
      collectionsById: {
        everything: {
          id: 'everything',
          name: 'Everything',
          rules: {
            root: {
              id: 'root',
              kind: 'group',
              operator: 'and',
              negated: false,
              children: [],
            },
          },
          createdAt: 1,
          updatedAt: 1,
        },
      },
      orderedCollectionIds: ['everything'],
      isHydrated: true,
    })
    useAnnotationStore.setState({
      annotationsByMediaId: {},
      tagsById: {},
      orderedTagIds: [],
      favoriteTagIds: [],
      favoritesOnly: false,
      untaggedOnly: false,
      selectedTagIds: [],
      bulkTagId: null,
      bulkSelectedMediaIds: [],
    })
    usePlaybackStore.setState({ recordsByMediaId: {} })
    useSettingsStore.setState({
      thumbnailPriority: 'paused',
      showFilenames: true,
    })
  })

  afterEach(cleanup)

  it('opens a 5,000-video collection while mounting only overscanned rows', () => {
    const { container, getByText } = render(
      <div id="void-main-scroll"><Collections /></div>,
    )

    const collectionButton = getByText('Everything').closest('button')
    expect(collectionButton).not.toBeNull()
    fireEvent.click(collectionButton!)

    expect(container).toHaveTextContent('5000 live matches')
    const mountedTiles = container.querySelectorAll('.media-tile')
    expect(mountedTiles.length).toBeGreaterThan(0)
    expect(mountedTiles.length).toBeLessThan(100)
    expect(container.querySelector('[aria-setsize="5000"]')).toBeInTheDocument()
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
