import { describe, expect, it } from 'vitest'
import { moveOwnedRecords } from './commitReconciliation'
import { reconcileMediaAssets } from './reconcileMediaAssets'
import type { MediaAsset } from '../store/mediaStore'

describe('verified rename ownership', () => {
  it('matches interleaved moves by identity without event pairing and rejects hard-link ambiguity', () => {
    const a = asset('a', 'inode-a'), b = asset('b', 'inode-b')
    const c = asset('c', 'inode-a'), d = asset('d', 'inode-b')
    expect(reconcileMediaAssets([a, b], [d, c]).renamedMediaIds).toEqual([{ fromId: 'a', toId: 'c' }, { fromId: 'b', toId: 'd' }])
    expect(reconcileMediaAssets([a, asset('link', 'inode-a')], [c]).renamedMediaIds).toEqual([])
    expect(reconcileMediaAssets([a], [c, asset('link', 'inode-a')]).renamedMediaIds).toEqual([])
  })
  it('moves both personal-data maps without mutating its source and leaves destination collisions recoverable', () => {
    const input = {
      'void-annotations-store': JSON.stringify({ version: 1, state: { annotationsByMediaId: { a: { favorite: true }, occupied: { favorite: false } } } }),
      'void-playback-store': JSON.stringify({ version: 1, state: { recordsByMediaId: { a: { positionSeconds: 12 } } } }),
    }
    const next = moveOwnedRecords(input, [{ fromId: 'a', toId: 'b' }])
    expect(next.annotationMap).toEqual({ b: { favorite: true }, occupied: { favorite: false } })
    expect(next.playbackMap).toEqual({ b: { positionSeconds: 12 } })
    expect(JSON.parse(input['void-playback-store']).state.recordsByMediaId.a).toBeDefined()
    const collision = moveOwnedRecords(input, [{ fromId: 'a', toId: 'occupied' }])
    expect(collision.records).toEqual(input)
  })
})
function asset(id: string, fileIdentity: string): MediaAsset {
  return { id, fileIdentity, libraryId: 'library', rootName: 'Videos', name: `${id}.mp4`, extension: '.mp4', pathParts: [], source: { kind: 'desktop-path', absolutePath: `C:\\Videos\\${id}.mp4` }, size: 100, lastModified: 1, thumbnailStatus: 'idle' }
}
