/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerEdgeZones } from './PlayerEdgeZones'

afterEach(cleanup)

describe('PlayerEdgeZones', () => {
  it('positions both navigation controls over the player', () => {
    const onPrevious = vi.fn()
    const onNext = vi.fn()
    render(
      <PlayerEdgeZones
        canNavigate
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    )

    const previousButton = screen.getByRole('button', { name: 'Previous video' })
    const nextButton = screen.getByRole('button', { name: 'Next video' })
    expect(previousButton.parentElement).toHaveClass('pointer-events-auto', 'absolute', 'left-4', 'z-50')
    expect(nextButton.parentElement).toHaveClass('pointer-events-auto', 'absolute', 'right-4', 'z-50')

    fireEvent.click(previousButton)
    fireEvent.click(nextButton)
    expect(onPrevious).toHaveBeenCalledOnce()
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('hides navigation controls when the current scope has one video', () => {
    render(
      <PlayerEdgeZones
        canNavigate={false}
        onPrevious={() => undefined}
        onNext={() => undefined}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Previous video' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next video' })).not.toBeInTheDocument()
  })
})
