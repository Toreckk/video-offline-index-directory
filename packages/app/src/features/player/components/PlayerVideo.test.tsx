/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayerVideo } from './PlayerVideo'

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('PlayerVideo', () => {
  it('flushes and releases the outgoing element and ignores its late events', () => {
    const progress = vi.fn()
    const complete = vi.fn()
    const props = { title: 'Video', resumeAt: 0, defaultVolume: 0.3, defaultPlaybackRate: 1, onProgress: progress, onComplete: complete }
    const { rerender, unmount } = render(<PlayerVideo {...props} src="blob:first" />)
    const first = screen.getByLabelText('Video') as HTMLVideoElement
    Object.defineProperty(first, 'duration', { value: 120 })
    first.currentTime = 17
    rerender(<PlayerVideo {...props} src="blob:second" />)
    expect(progress).toHaveBeenCalledExactlyOnceWith(17, 120)
    expect(first).not.toHaveAttribute('src')
    expect(first.pause).toHaveBeenCalled()
    fireEvent.ended(first)
    fireEvent.timeUpdate(first)
    expect(complete).not.toHaveBeenCalled()
    expect(progress).toHaveBeenCalledTimes(1)
    const second = screen.getByLabelText('Video')
    unmount()
    expect(second).not.toHaveAttribute('src')
  })

  it('shows an actionable unsupported-codec error', () => {
    render(<PlayerVideo src="blob:bad" title="Bad" resumeAt={0} defaultVolume={1} defaultPlaybackRate={1} onProgress={vi.fn()} onComplete={vi.fn()} />)
    const video = screen.getByLabelText('Bad')
    Object.defineProperty(video, 'error', { value: { code: 4 } })
    fireEvent.error(video)
    expect(screen.getByRole('alert')).toHaveTextContent('not supported')
  })
  it('exposes native playback and volume controls', () => {
    render(
      <PlayerVideo
        src="blob:test-video"
        title="Test video"
        resumeAt={0}
        defaultVolume={0.3}
        defaultPlaybackRate={1}
        onProgress={vi.fn()}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Test video')).toHaveAttribute('controls')
  })
})
