/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaAsset } from '../../explorer/store/mediaStore'
import { DuplicateReview } from './DuplicateReview'

const mocks = vi.hoisted(() => ({
  copyText: vi.fn(async () => undefined),
  detectDuplicates: vi.fn(),
}))

vi.mock('idb-keyval', () => ({ get: vi.fn(async () => undefined), set: vi.fn(async () => undefined), del: vi.fn(async () => undefined) }))
vi.mock('../../../utils/clipboard', () => ({ copyTextToClipboard: mocks.copyText }))
vi.mock('../../explorer/hooks/useThumbnailUrl', () => ({ useThumbnailUrl: () => null }))
vi.mock('../services/duplicateDetection', () => ({ detectDuplicateMedia: mocks.detectDuplicates }))

const assets = [createAsset('original', 'Holiday.mp4'), createAsset('copy', 'Holiday (1).mp4')]

beforeEach(() => {
  mocks.copyText.mockClear()
  mocks.detectDuplicates.mockReset()
  mocks.detectDuplicates.mockResolvedValue({
    highConfidenceGroups: [assets],
    nameCollisionGroups: [],
    filesHashed: 2,
  })
})

afterEach(cleanup)

describe('DuplicateReview', () => {
  it('copies only the filename and keeps per-row copied feedback until remount', async () => {
    const firstRender = render(<DuplicateReview assets={assets} />)
    fireEvent.click(screen.getByRole('button', { name: 'Scan for duplicates' }))
    const copyButton = await screen.findByRole('button', { name: 'Copy filename for Holiday.mp4' })

    fireEvent.click(copyButton)
    expect(mocks.copyText).toHaveBeenCalledWith('Holiday.mp4')
    expect(await screen.findByRole('button', { name: 'Copied filename Holiday.mp4' })).toHaveTextContent('Copied!')

    firstRender.unmount()
    render(<DuplicateReview assets={assets} />)
    fireEvent.click(screen.getByRole('button', { name: 'Scan for duplicates' }))
    expect(await screen.findByRole('button', { name: 'Copy filename for Holiday.mp4' })).toHaveTextContent('Filename')
  })
})

function createAsset(id: string, name: string): MediaAsset {
  return {
    id,
    libraryId: 'library',
    rootName: 'Videos',
    name,
    extension: '.mp4',
    pathParts: ['Folder A'],
    source: { kind: 'session-file', file: new File([], name) },
    size: 10,
    lastModified: 1,
    thumbnailStatus: 'idle',
  }
}
