import { describe, expect, it } from 'vitest'
import type { MediaAsset } from '../store/mediaStore'
import { sortMediaAssets } from './sortMediaAssets'

const assets = [
  { id: 'old-large', name: 'z.mp4', size: 30, lastModified: 1 },
  { id: 'new-small', name: 'a.mp4', size: 10, lastModified: 3 },
  { id: 'middle', name: 'm.mp4', size: 20, lastModified: 2 },
] as MediaAsset[]

describe('sortMediaAssets', () => {
  it('matches Explorer display order for thumbnail scheduling', () => {
    expect(sortMediaAssets(assets, 'modified-date').map(({ id }) => id)).toEqual([
      'new-small',
      'middle',
      'old-large',
    ])
    expect(sortMediaAssets(assets, 'name').map(({ id }) => id)).toEqual([
      'new-small',
      'middle',
      'old-large',
    ])
    expect(sortMediaAssets(assets, 'size').map(({ id }) => id)).toEqual([
      'old-large',
      'middle',
      'new-small',
    ])
  })
})
