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

  it('keeps one popover open and closes it on an outside pointer', () => {
    const options = [{ value: '', label: 'Default' }]
    render(<><ThemedSelect ariaLabel="First dropdown" value="" onChange={() => undefined} options={options} /><ThemedSelect ariaLabel="Second dropdown" value="" onChange={() => undefined} options={options} /></>)

    fireEvent.click(screen.getByRole('button', { name: 'First dropdown' }))
    expect(screen.getByRole('listbox', { name: 'First dropdown' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Second dropdown' }))
    expect(screen.queryByRole('listbox', { name: 'First dropdown' })).not.toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Second dropdown' })).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('listbox', { name: 'Second dropdown' })).not.toBeInTheDocument()
  })

  it('uses the first outside click only to dismiss instead of activating content underneath', () => {
    const activateBehind = vi.fn()
    render(<><ThemedSelect ariaLabel="Open menu" value="" onChange={() => undefined} options={[{ value: '', label: 'Default' }]} /><button type="button" onClick={activateBehind}>Video behind menu</button></>)

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const behind = screen.getByRole('button', { name: 'Video behind menu' })
    fireEvent.pointerDown(behind)
    fireEvent.click(behind)
    expect(activateBehind).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox', { name: 'Open menu' })).not.toBeInTheDocument()
  })
})
