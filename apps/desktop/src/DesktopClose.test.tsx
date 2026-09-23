/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DesktopShell } from './DesktopShell'

const mocks = vi.hoisted(() => ({
  destroy: vi.fn(async () => undefined),
  flush: vi.fn(async (): Promise<void> => undefined),
  retry: vi.fn(async () => undefined),
  export: vi.fn(async () => undefined),
  pending: false,
  phase: 'ready' as 'ready' | 'error',
  closeRequest: null as null | ((event: { preventDefault: () => void }) => void),
}))
vi.mock('@void/platform-desktop', () => ({ createDesktopWindowController: () => ({
  destroy: mocks.destroy,
  close: async () => undefined,
  onCloseRequested: async (listener: (event: { preventDefault: () => void }) => void) => { mocks.closeRequest = listener; return () => { mocks.closeRequest = null } },
  isMaximized: async () => false,
  minimize: async () => undefined,
  onResized: async () => () => undefined,
  setDecorations: async () => undefined,
  toggleMaximize: async () => undefined,
}) }))
vi.mock('../../../packages/app/src/features/settings/store/settingsStore', () => ({ useSettingsStore: (selector: (state: { isHydrated: boolean; themedDesktopTitleBar: boolean }) => unknown) => selector({ isHydrated: false, themedDesktopTitleBar: false }) }))
vi.mock('../../../packages/app/src/shared/persistence/userDataCoordinator', () => ({
  flushUserData: mocks.flush,
  retryUserData: mocks.retry,
  exportRecovery: mocks.export,
  hasUnsavedUserData: () => mocks.pending,
  getPersistenceStatus: () => ({ phase: mocks.phase, message: 'Save failed' }),
}))

beforeEach(() => {
  mocks.destroy.mockClear()
  mocks.flush.mockReset().mockResolvedValue(undefined)
  mocks.retry.mockClear()
  mocks.export.mockClear()
  mocks.pending = false
  mocks.phase = 'ready'
})
afterEach(cleanup)

function requestClose() {
  const preventDefault = vi.fn()
  mocks.closeRequest!({ preventDefault })
  return preventDefault
}

it('lets the native close proceed immediately after capturing playback when no save is pending', async () => {
  render(<DesktopShell><video aria-label="Playing" /></DesktopShell>)
  await waitFor(() => expect(mocks.closeRequest).not.toBeNull())
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  const preventDefault = requestClose()
  expect(pause).toHaveBeenCalledOnce()
  expect(preventDefault).not.toHaveBeenCalled()
  expect(mocks.flush).not.toHaveBeenCalled()
  pause.mockRestore()
})

it('shows save progress and closes only after the pending save completes', async () => {
  mocks.pending = true
  let finish!: () => void
  mocks.flush.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
  render(<DesktopShell><span>Library</span></DesktopShell>)
  await waitFor(() => expect(mocks.closeRequest).not.toBeNull())
  expect(requestClose()).toHaveBeenCalledOnce()
  expect(await screen.findByRole('alertdialog')).toHaveTextContent('Saving before closing')
  expect(mocks.destroy).not.toHaveBeenCalled()
  finish()
  await waitFor(() => expect(mocks.destroy).toHaveBeenCalledOnce())
})

it('offers recovery and an explicit exit if saving fails', async () => {
  mocks.pending = true
  mocks.flush.mockRejectedValueOnce(new Error('Disk unavailable'))
  render(<DesktopShell><span>Library</span></DesktopShell>)
  await waitFor(() => expect(mocks.closeRequest).not.toBeNull())
  requestClose()
  expect(await screen.findByText('Error: Disk unavailable')).toBeInTheDocument()
  expect(mocks.destroy).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Export recovery data' }))
  await waitFor(() => expect(mocks.export).toHaveBeenCalledOnce())
  fireEvent.click(screen.getByRole('button', { name: 'Close without saving' }))
  await waitFor(() => expect(mocks.destroy).toHaveBeenCalledOnce())
})

it('offers an explicit exit after a slow save without closing again when that save settles', async () => {
  mocks.pending = true
  let finish!: () => void
  mocks.flush.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
  render(<DesktopShell><span>Library</span></DesktopShell>)
  await waitFor(() => expect(mocks.closeRequest).not.toBeNull())
  vi.useFakeTimers()
  try {
    act(() => { requestClose() })
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Saving before closing')
    act(() => { vi.advanceTimersByTime(2500) })
    expect(screen.getByText(/Saving is taking longer/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close without saving' }))
    expect(mocks.destroy).toHaveBeenCalledOnce()
    await act(async () => { finish() })
    expect(mocks.destroy).toHaveBeenCalledOnce()
  } finally { vi.useRealTimers() }
})
