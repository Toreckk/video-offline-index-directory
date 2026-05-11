import { describe, expect, it } from 'vitest'
import {
  getSupportedVideoExtension,
  isFutureVideoFile,
  isSupportedVideoFile,
} from './videoExtensions'

describe('video extension helpers', () => {
  it('accepts mp4 and webm files case-insensitively', () => {
    expect(getSupportedVideoExtension('clip.MP4')).toBe('.mp4')
    expect(getSupportedVideoExtension('scene.webm')).toBe('.webm')
    expect(isSupportedVideoFile('folder/archive.WEBM')).toBe(true)
  })

  it('rejects future video formats from supported scan results', () => {
    expect(getSupportedVideoExtension('clip.mov')).toBeNull()
    expect(getSupportedVideoExtension('clip.mkv')).toBeNull()
    expect(getSupportedVideoExtension('clip.r3d')).toBeNull()
    expect(isSupportedVideoFile('clip.mov')).toBe(false)
  })

  it('identifies known future formats separately from random files', () => {
    expect(isFutureVideoFile('clip.MOV')).toBe(true)
    expect(isFutureVideoFile('clip.mkv')).toBe(true)
    expect(isFutureVideoFile('clip.r3d')).toBe(true)
    expect(isFutureVideoFile('notes.txt')).toBe(false)
  })
})
