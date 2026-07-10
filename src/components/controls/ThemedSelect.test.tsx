/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemedSelect } from './ThemedSelect'

afterEach(cleanup)

describe('ThemedSelect', () => {
  it('renders an app-owned listbox and commits a selection', () => {
    const onChange = vi.fn()
    render(<ThemedSelect ariaLabel="Folder filter" value="" onChange={onChange} options={[{ value: '', label: 'All folders', detail: '10' }, { value: 'Trips', label: 'Trips', detail: '4' }]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Folder filter' }))
    expect(screen.getByRole('listbox', { name: 'Folder filter' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'Trips4' }))
    expect(onChange).toHaveBeenCalledWith('Trips')
    expect(screen.queryByRole('listbox', { name: 'Folder filter' })).not.toBeInTheDocument()
  })
})
