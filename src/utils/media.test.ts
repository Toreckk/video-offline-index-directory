import { describe, expect, it } from 'vitest'
import {
  createMediaId,
  formatBytes,
  formatDuration,
  getDisplayPath,
  isSupportedVideoExtension,
} from './media'

describe('media helpers', () => {
  it('creates stable, escaped ids from route-relative paths', () => {
    expect(createMediaId('Library', ['A/B'], 'clip one.mp4')).toBe(
      'Library/A%2FB/clip%20one.mp4',
    )
  })

  it('namespaces identical relative paths by durable library id', () => {
    expect(createMediaId('lib_one', [], 'clip.mp4')).not.toBe(
      createMediaId('lib_two', [], 'clip.mp4'),
    )
  })

  it('formats media metadata for display', () => {
    expect(formatBytes(1_572_864)).toBe('1.5 MB')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3665)).toBe('1:01:05')
    expect(getDisplayPath(['Reel 1'], 'clip.mp4')).toBe('Reel 1 / clip.mp4')
  })

  it('accepts only v1 extensions', () => {
    expect(isSupportedVideoExtension('.mp4')).toBe(true)
    expect(isSupportedVideoExtension('.webm')).toBe(true)
    expect(isSupportedVideoExtension('.mov')).toBe(false)
  })
})
