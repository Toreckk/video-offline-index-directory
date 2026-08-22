import { describe, expect, it } from 'vitest'
import type { MediaAsset } from '../store/mediaStore'
import { reconcileMediaAssets } from './reconcileMediaAssets'

describe('reconcileMediaAssets', () => {
  it('preserves enrichment for unchanged videos and their displayed order', () => {
    const existing = [asset('b', 2), asset('a', 1, { thumbnailStatus: 'ready', duration: 12 })]
    const result = reconcileMediaAssets(existing, [asset('a', 1), asset('b', 2)])

    expect(result.assets.map(({ id }) => id)).toEqual(['b', 'a'])
    expect(result.assets[1]).toMatchObject({ thumbnailStatus: 'ready', duration: 12 })
    expect(result.affectedAssets).toEqual([])
  })

  it('resets only changed videos for enrichment', () => {
    const existing = [asset('a', 1, { thumbnailStatus: 'ready', duration: 12 })]
    const changed = asset('a', 2)
    const result = reconcileMediaAssets(existing, [changed])

    expect(result.changedAssets).toEqual([changed])
    expect(result.affectedAssets).toEqual([changed])
    expect(result.assets[0]).toMatchObject({ thumbnailStatus: 'idle' })
  })

  it('requeues unchanged thumbnail work interrupted by a newer reconciliation', () => {
    const queued = asset('a', 1, { thumbnailStatus: 'queued' })
    const result = reconcileMediaAssets([queued], [asset('a', 1)])

    expect(result.assets[0]).toMatchObject({ thumbnailStatus: 'queued' })
    expect(result.affectedAssets).toEqual([result.assets[0]])
  })

  it('adds new videos and removes missing videos atomically', () => {
    const added = asset('new', 1)
    const result = reconcileMediaAssets([asset('kept', 1), asset('gone', 1)], [asset('kept', 1), added])

    expect(result.assets.map(({ id }) => id)).toEqual(['kept', 'new'])
    expect(result.addedAssets).toEqual([added])
    expect(result.removedIds).toEqual(['gone'])
  })

  it('preserves cached enrichment and reports metadata migration for an explicit rename', () => {
    const before = asset('old-id', 1, { name: 'before.mp4', thumbnailStatus: 'ready', duration: 9 })
    const after = asset('new-id', 1, { name: 'after.mp4' })
    const result = reconcileMediaAssets([before], [after], [{ fromPath: 'before.mp4', toPath: 'after.mp4' }])

    expect(result.assets[0]).toMatchObject({ id: 'new-id', thumbnailStatus: 'ready', duration: 9 })
    expect(result.renamedMediaIds).toEqual([{ fromId: 'old-id', toId: 'new-id' }])
    expect(result.removedIds).toEqual([])
    expect(result.affectedAssets).toEqual([])
  })
})

function asset(
  id: string,
  version: number,
  patch: Partial<MediaAsset> = {},
): MediaAsset {
  const name = patch.name ?? `${id}.mp4`
  return {
    id,
    libraryId: 'library',
    rootName: 'Videos',
    name,
    extension: '.mp4',
    pathParts: [],
    source: { kind: 'desktop-path', absolutePath: `C:\\Videos\\${name}` },
    size: 100,
    lastModified: version,
    thumbnailStatus: 'idle',
    ...patch,
  }
}
