/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installVoidPlatform, type VoidPlatform } from '@void/core'
import type { MediaAsset } from '../../media/store/mediaStore'
import { useMediaStore } from '../../media/store/mediaStore'
import { DuplicateReview } from './DuplicateReview'

const mocks = vi.hoisted(() => ({
  copyText: vi.fn(async () => undefined),
  detectDuplicates: vi.fn(),
  cleanup: vi.fn(),
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
    exactGroups: [],
    probableGroups: [{
      assets,
      classification: 'probable',
      evidence: ['Normalized filename family matches'],
    }],
    filesHashed: 2,
    fingerprintKind: 'sampled',
  })
  mocks.cleanup.mockReset()
  useMediaStore.setState({ assetsById: {}, orderedIds: [] })
})

afterEach(() => {
  cleanup()
  installVoidPlatform(webPlatform())
})

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

  it('requires explicit confirmation before exact desktop copies are recycled', async () => {
    const desktopAssets = [createDesktopAsset('original', 'Holiday.mp4'), createDesktopAsset('copy', 'Holiday (1).mp4')]
    mocks.detectDuplicates.mockResolvedValue({
      exactGroups: [{
        assets: desktopAssets,
        classification: 'exact',
        evidence: ['Complete SHA-256 matches byte for byte'],
        completeHash: 'a'.repeat(64),
      }],
      probableGroups: [],
      filesHashed: 2,
      fingerprintKind: 'complete',
    })
    mocks.cleanup.mockResolvedValue({
      keptPath: 'C:\\Videos\\Holiday.mp4',
      movedPaths: ['C:\\Videos\\Holiday (1).mp4'],
      skipped: [],
      failed: [],
    })
    installVoidPlatform(desktopPlatform())
    useMediaStore.setState({
      assetsById: Object.fromEntries(desktopAssets.map((asset) => [asset.id, asset])),
      orderedIds: desktopAssets.map((asset) => asset.id),
    })
    render(<DuplicateReview assets={desktopAssets} />)
    fireEvent.click(screen.getByRole('button', { name: 'Scan for duplicates' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Review Recycle Bin cleanup' }))
    expect(mocks.cleanup).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Recycle Bin move' }))

    await waitFor(() => {
      expect(mocks.cleanup).toHaveBeenCalledWith({
        keeper: { absolutePath: 'C:\\Videos\\Holiday.mp4', expectedSha256: 'a'.repeat(64) },
        redundantFiles: [{ absolutePath: 'C:\\Videos\\Holiday (1).mp4', expectedSha256: 'a'.repeat(64) }],
      })
      expect(useMediaStore.getState().orderedIds).toEqual(['original'])
      expect(screen.getByText('1 file moved to the Recycle Bin. 0 skipped · 0 failed.')).toBeInTheDocument()
    })
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

function createDesktopAsset(id: string, name: string): MediaAsset {
  return {
    ...createAsset(id, name),
    source: { kind: 'desktop-path', absolutePath: `C:\\Videos\\${name}` },
  }
}

function webPlatform(): VoidPlatform {
  return {
    kind: 'web',
    capabilities: {
      persistentLibraryAccess: true,
      nativeCatalog: false,
      diskThumbnailCache: false,
      revealInFileManager: false,
      fullFileHashing: false,
      nativeMediaProbe: false,
      recycleBinCleanup: false,
    },
  }
}

function desktopPlatform(): VoidPlatform {
  return {
    kind: 'desktop',
    capabilities: {
      persistentLibraryAccess: true,
      nativeCatalog: true,
      diskThumbnailCache: true,
      revealInFileManager: true,
      fullFileHashing: true,
      nativeMediaProbe: true,
      recycleBinCleanup: true,
    },
    cleanupDuplicateFiles: mocks.cleanup,
  }
}
