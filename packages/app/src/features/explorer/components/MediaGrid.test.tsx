/** @vitest-environment jsdom */

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaAsset } from '../../media/store/mediaStore'
import { useMediaStore } from '../../media/store/mediaStore'
import { useAnnotationStore } from '../../annotations/store/annotationStore'
import { usePlaybackStore } from '../../playback/store/playbackStore'
import { useSettingsStore } from '../../settings/store/settingsStore'
import { MediaGrid } from './MediaGrid'

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
  del: vi.fn(async () => undefined),
  keys: vi.fn(async () => []),
}))

Object.defineProperties(HTMLElement.prototype, {
  clientWidth: { configurable: true, get: () => 1_184 },
  clientHeight: { configurable: true, get: () => 900 },
  offsetTop: { configurable: true, get: () => 100 },
})

describe('MediaGrid virtualization', () => {
  beforeEach(() => {
    useMediaStore.setState({ searchQuery: '', folderFilter: null })
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
      defaultSortOrder: 'modified-date',
      thumbnailPriority: 'paused',
      tileDensity: 'comfortable',
    })
  })

  afterEach(cleanup)

  it('keeps a 5,000-video queue while mounting only overscanned rows', () => {
    useMediaStore.getState().replaceAssets(createAssets(5_000))
    const { container } = render(<div id="void-main-scroll"><MediaGrid /></div>)

    expect(container).toHaveTextContent('5000 of 5000')
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
