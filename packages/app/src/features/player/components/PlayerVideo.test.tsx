/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerVideo } from './PlayerVideo'

afterEach(cleanup)

describe('PlayerVideo', () => {
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
