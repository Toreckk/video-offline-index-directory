import { describe, expect, it } from 'vitest'
import type { MediaAsset } from '../../explorer/store/mediaStore'
import { detectDuplicateMedia } from './duplicateDetection'

function asset(id: string, name: string, size: number): MediaAsset {
  return {
    id,
    libraryId: 'library',
    rootName: 'Library',
    name,
    extension: '.mp4',
    pathParts: [id],
    source: { kind: 'session-file', file: new File([], name) },
    size,
    lastModified: 1,
    thumbnailStatus: 'idle',
  }
}

describe('detectDuplicateMedia', () => {
  it('hashes only same-size candidates and reports same-name collisions separately', async () => {
    const assets = [asset('one', 'clip.mp4', 10), asset('two', 'clip.mp4', 10), asset('three', 'other.mp4', 20)]
    const hashed: string[] = []
    const result = await detectDuplicateMedia(assets, {
      fingerprintAsset: async (item) => { hashed.push(item.id); return 'matching' },
    })

    expect(hashed.sort()).toEqual(['one', 'two'])
    expect(result.highConfidenceGroups.map((group) => group.map((item) => item.id))).toEqual([['one', 'two']])
    expect(result.nameCollisionGroups.map((group) => group.map((item) => item.id))).toEqual([['one', 'two']])
  })
})
