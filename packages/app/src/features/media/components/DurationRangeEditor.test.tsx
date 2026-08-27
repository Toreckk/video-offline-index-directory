/** @vitest-environment jsdom */

import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { DurationRange } from '../model/durationRange'
import { DurationRangeEditor } from './DurationRangeEditor'

afterEach(cleanup)

describe('DurationRangeEditor', () => {
  it('uses the library bounds and updates both ends of the range', () => {
    render(<Harness />)

    expect(screen.getByText('Library range: 8:00 to 12:00. Both selected limits are included.')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('slider', { name: 'Minimum duration' }), { target: { value: '540' } })
    fireEvent.change(screen.getByRole('slider', { name: 'Maximum duration' }), { target: { value: '600' } })

    expect(screen.getByLabelText('Minimum minutes')).toHaveValue(9)
    expect(screen.getByLabelText('Maximum minutes')).toHaveValue(10)
    expect(screen.getByText('9:00–10:00')).toBeInTheDocument()
  })

  it('defaults to the complete library span without mode tabs', () => {
    render(<Harness />)
    expect(screen.getByLabelText('Minimum minutes')).toHaveValue(8)
    expect(screen.getByLabelText('Maximum minutes')).toHaveValue(12)
    expect(screen.queryByRole('button', { name: 'Any' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Unknown/ })).not.toBeInTheDocument()
  })

  it('provides one-click resets to the measured library limits', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText('Minimum minutes'), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText('Maximum minutes'), { target: { value: '10' } })

    fireEvent.click(screen.getByRole('button', { name: 'Reset minimum minutes to library min' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset maximum minutes to library max' }))

    expect(screen.getByLabelText('Minimum minutes')).toHaveValue(8)
    expect(screen.getByLabelText('Maximum minutes')).toHaveValue(12)
  })
})

function Harness() {
  const [value, setValue] = useState<DurationRange | null>(null)
  return <DurationRangeEditor value={value} bounds={{ minimumSeconds: 480, maximumSeconds: 720 }} onChange={setValue} />
}
