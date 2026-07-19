/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings'

vi.mock('idb-keyval', () => ({ get: vi.fn(async () => undefined), set: vi.fn(async () => undefined), del: vi.fn(async () => undefined), entries: vi.fn(async () => []) }))
afterEach(cleanup)

describe('Settings', () => {
  it('defaults to displayed order and repeats the current video', () => {
    render(<Settings />)
    expect(screen.getByRole('combobox', { name: /Playback order/ })).toHaveValue('displayed')
    expect(screen.getByRole('combobox', { name: /RepeatStop/ })).toHaveValue('one')
  })

  it('separates tag administration from general preferences', () => {
    render(<Settings />)
    expect(screen.getByText('Playback')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tags.*Catalog and backup/ }))
    expect(screen.getByText('Tag catalog')).toBeInTheDocument()
    expect(screen.getByText('Backup & transfer')).toBeInTheDocument()
    expect(screen.queryByText('Playback')).not.toBeInTheDocument()
  })
})
