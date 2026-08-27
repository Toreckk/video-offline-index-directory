/** @vitest-environment jsdom */

import 'fake-indexeddb/auto'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DesktopWindowController } from '@void/platform-desktop'
import { DesktopShellFrame } from './DesktopShell'

afterEach(cleanup)

describe('DesktopShellFrame', () => {
  it('waits for settings hydration before changing window decorations', async () => {
    const controller = createController()
    const view = render(
      <DesktopShellFrame controller={controller} isHydrated={false} prefersThemedTitleBar>
        <main>Content</main>
      </DesktopShellFrame>,
    )

    expect(controller.setDecorations).not.toHaveBeenCalled()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()

    view.rerender(
      <DesktopShellFrame controller={controller} isHydrated prefersThemedTitleBar>
        <main>Content</main>
      </DesktopShellFrame>,
    )

    await waitFor(() => expect(controller.setDecorations).toHaveBeenCalledWith(false))
    await waitFor(() => expect(screen.getByRole('banner')).toBeInTheDocument())
  })

  it('serializes rapid title-bar preference changes so the final state wins', async () => {
    const updates: DeferredDecoration[] = []
    const controller = createController(
      (decorated) => new Promise<void>((resolve) => updates.push({ decorated, resolve })),
    )
    const children = <main>Content</main>
    const view = render(
      <DesktopShellFrame controller={controller} isHydrated={false} prefersThemedTitleBar>
        {children}
      </DesktopShellFrame>,
    )

    view.rerender(
      <DesktopShellFrame controller={controller} isHydrated prefersThemedTitleBar>
        {children}
      </DesktopShellFrame>,
    )
    await waitFor(() => expect(updates).toHaveLength(1))
    expect(updates[0]?.decorated).toBe(false)

    view.rerender(
      <DesktopShellFrame controller={controller} isHydrated prefersThemedTitleBar={false}>
        {children}
      </DesktopShellFrame>,
    )
    view.rerender(
      <DesktopShellFrame controller={controller} isHydrated prefersThemedTitleBar>
        {children}
      </DesktopShellFrame>,
    )
    expect(updates).toHaveLength(1)

    await act(async () => {
      updates[0]?.resolve()
      await Promise.resolve()
    })
    await waitFor(() => expect(updates).toHaveLength(2))
    expect(updates[1]?.decorated).toBe(true)

    await act(async () => {
      updates[1]?.resolve()
      await Promise.resolve()
    })
    await waitFor(() => expect(updates).toHaveLength(3))
    expect(updates[2]?.decorated).toBe(false)
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()

    await act(async () => {
      updates[2]?.resolve()
      await Promise.resolve()
    })
    await waitFor(() => expect(screen.getByRole('banner')).toBeInTheDocument())
  })
})

type DeferredDecoration = {
  decorated: boolean
  resolve: () => void
}

function createController(
  setDecorations: DesktopWindowController['setDecorations'] = async () => undefined,
): DesktopWindowController {
  return {
    close: vi.fn(async () => undefined),
    isMaximized: vi.fn(async () => false),
    minimize: vi.fn(async () => undefined),
    onResized: vi.fn(async () => () => undefined),
    setDecorations: vi.fn(setDecorations),
    toggleMaximize: vi.fn(async () => undefined),
  }
}
