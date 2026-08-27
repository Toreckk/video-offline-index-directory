import { describe, expect, it } from 'vitest'
import type { MediaAsset } from '../../media/store/mediaStore'
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
    expect(result.probableGroups.map((group) => group.assets.map((item) => item.id))).toEqual([['one', 'two']])
    expect(result.exactGroups).toEqual([])
  })

  it('orders original filenames before numbered duplicate copies', async () => {
    const assets = [
      asset('copy-ten', 'Holiday (10).mp4', 10),
      asset('copy-two', 'Holiday (2).mp4', 10),
      asset('original', 'Holiday.mp4', 10),
      asset('copy-one', 'Holiday (1).mp4', 10),
    ]
    const result = await detectDuplicateMedia(assets, {
      fingerprintAsset: async () => 'matching',
    })

    expect(result.probableGroups[0]?.assets.map((item) => item.name)).toEqual([
      'Holiday.mp4',
      'Holiday (1).mp4',
      'Holiday (2).mp4',
      'Holiday (10).mp4',
    ])
  })

  it('classifies complete hashes as exact and explains shared technical evidence', async () => {
    const assets = [
      { ...asset('one', 'clip.mp4', 10), duration: 30, width: 1920, height: 1080, videoCodec: 'h264' },
      { ...asset('two', 'clip (1).mp4', 10), duration: 30.5, width: 1920, height: 1080, videoCodec: 'h264' },
    ]
    const result = await detectDuplicateMedia(assets, {
      fingerprintAsset: async () => 'a'.repeat(64),
      fingerprintKind: 'complete',
    })

    expect(result.exactGroups).toHaveLength(1)
    expect(result.exactGroups[0]?.completeHash).toBe('a'.repeat(64))
    expect(result.exactGroups[0]?.evidence).toEqual(expect.arrayContaining([
      'Complete SHA-256 matches byte for byte',
      'Duration matches within 1 second',
      'Dimensions match: 1920 × 1080',
      'Video codec matches: h264',
    ]))
  })

  it('indexes a 5,000-video library while hashing only same-size candidates', async () => {
    const assets = Array.from({ length: 5_000 }, (_, index) =>
      asset(`video-${index}`, `video-${index}.mp4`, index + 1),
    )
    assets.push(asset('copy-a', 'Family.mp4', 10_000), asset('copy-b', 'Family (1).mp4', 10_000))
    let fingerprints = 0

    const result = await detectDuplicateMedia(assets, {
      fingerprintAsset: async () => {
        fingerprints += 1
        return 'matching'
      },
    })

    expect(fingerprints).toBe(2)
    expect(result.filesHashed).toBe(2)
    expect(result.probableGroups).toHaveLength(1)
  })
})
