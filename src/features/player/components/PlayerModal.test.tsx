/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayerModal } from './PlayerModal'
import { useMediaStore, type MediaAsset } from '../../explorer/store/mediaStore'
import { usePlayerStore } from '../store/playerStore'
import { DEFAULT_SETTINGS, useSettingsStore } from '../../settings/store/settingsStore'

vi.mock('idb-keyval', () => ({ get: vi.fn(async () => undefined), set: vi.fn(async () => undefined), del: vi.fn(async () => undefined) }))
vi.mock('../hooks/usePlayerMediaUrls', () => ({ usePlayerMediaUrls: () => 'blob:test-video' }))
vi.mock('./PlayerVideo', () => ({ PlayerVideo: ({ title }: { title: string }) => <video aria-label={title} /> }))
vi.mock('./PlayerAnnotationControls', () => ({ PlayerAnnotationControls: () => null }))
vi.mock('../../annotations/components/MediaTagEditor', () => ({ MediaTagEditor: () => null }))

const assets = [createAsset('first'), createAsset('second')]

beforeEach(() => {
  vi.useFakeTimers()
  useMediaStore.setState({
    assetsById: Object.fromEntries(assets.map((asset) => [asset.id, asset])),
    orderedIds: assets.map((asset) => asset.id),
    searchQuery: '',
    folderFilter: null,
    activePreviewId: null,
  })
  usePlayerStore.setState({
    selectedAssetId: 'first',
    queueIds: ['first', 'second'],
    historyIds: ['first'],
    historyIndex: 0,
    smartRemainingIds: [],
    playedInCycle: 0,
  })
  useSettingsStore.setState({ ...DEFAULT_SETTINGS, isHydrated: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  usePlayerStore.getState().closePlayer()
  useMediaStore.getState().clearAssets()
})

describe('PlayerModal chrome', () => {
  it('hides after inactivity or pointer exit and returns on pointer activity', () => {
    render(<PlayerModal />)
    const dialog = screen.getByRole('dialog')
    const frame = dialog.firstElementChild as HTMLElement
    const previousButton = screen.getByRole('button', { name: 'Previous video' })
    const chrome = previousButton.parentElement?.parentElement

    expect(chrome).toHaveClass('opacity-100')
    act(() => vi.advanceTimersByTime(3_000))
    expect(chrome).toHaveClass('pointer-events-none', 'opacity-0')

    fireEvent.pointerMove(frame)
    expect(chrome).toHaveClass('opacity-100')

    fireEvent.pointerLeave(frame)
    expect(chrome).toHaveClass('pointer-events-none', 'opacity-0')
  })
})

function createAsset(id: string): MediaAsset {
  return {
    id,
    libraryId: 'library',
    rootName: 'Videos',
    name: `${id}.mp4`,
    extension: '.mp4',
    pathParts: [],
    source: { kind: 'session-file', file: new File([], `${id}.mp4`) },
    size: 10,
    lastModified: 1,
    thumbnailStatus: 'ready',
  }
}
