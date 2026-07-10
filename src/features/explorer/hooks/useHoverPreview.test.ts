import { describe, expect, it } from 'vitest'
import { getSnippetPoints } from '../services/previewSchedule'

describe('getSnippetPoints', () => {
  it('uses the first frame for short videos', () => {
    expect(getSnippetPoints(5)).toEqual([0])
  })

  it('samples three points for medium videos', () => {
    expect(getSnippetPoints(20)).toEqual([2, 9, 15])
  })

  it('samples five points across long videos', () => {
    expect(getSnippetPoints(120)).toHaveLength(5)
    expect(getSnippetPoints(120)[0]).toBeCloseTo(9.6)
  })
})
