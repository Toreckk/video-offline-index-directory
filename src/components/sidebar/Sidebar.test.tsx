/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { APP_VIEWS, VIEW_IDS } from '../../app/views'
import Sidebar from './Sidebar'

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
  del: vi.fn(async () => undefined),
  keys: vi.fn(async () => []),
}))

afterEach(cleanup)

describe('Sidebar', () => {
  it('renders every registered view and reports navigation by view id', () => {
    const onNavigate = vi.fn()
    render(
      <Sidebar
        activeView={VIEW_IDS.explorer}
        navItems={APP_VIEWS}
        onNavigate={onNavigate}
      />,
    )

    for (const view of APP_VIEWS) {
      expect(screen.getByRole('button', { name: view.label })).toBeInTheDocument()
    }

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onNavigate).toHaveBeenCalledWith(VIEW_IDS.settings)
  })
})
