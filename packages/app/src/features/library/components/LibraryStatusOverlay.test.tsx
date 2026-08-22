/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppNavigationContext } from '../../../app/navigationContext'
import { useSettingsStore } from '../../settings/store/settingsStore'
import { useLibraryStore } from '../store/libraryStore'
import { LibraryStatusOverlay } from './LibraryStatusOverlay'

vi.mock('idb-keyval', () => ({ get: vi.fn(async () => undefined), set: vi.fn(async () => undefined), del: vi.fn(async () => undefined) }))

describe('LibraryStatusOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useLibraryStore.setState({ scanStatus: 'ready', scanPhase: 'complete', scanProgress: { foldersScanned: 1, videosFound: 4, thumbnailsGenerated: 4, thumbnailTotal: 4 }, isBackgroundScanning: false })
    useSettingsStore.setState({ libraryReadyNotificationSeconds: 10 })
  })

  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('dismisses the ready message after the configured delay', () => {
    const onDismiss = vi.fn()
    render(<AppNavigationContext.Provider value={{ activeView: 'folders', navigate: vi.fn() }}><LibraryStatusOverlay successDismissed={false} onDismissSuccess={onDismiss} /></AppNavigationContext.Provider>)
    expect(screen.getByText('Library ready')).toBeInTheDocument()
    vi.advanceTimersByTime(9_999)
    expect(onDismiss).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('keeps the message open when the timeout is zero', () => {
    useSettingsStore.setState({ libraryReadyNotificationSeconds: 0 })
    const onDismiss = vi.fn()
    render(<AppNavigationContext.Provider value={{ activeView: 'folders', navigate: vi.fn() }}><LibraryStatusOverlay successDismissed={false} onDismissSuccess={onDismiss} /></AppNavigationContext.Provider>)
    vi.advanceTimersByTime(60_000)
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('does not show and permanently dismisses the message when Explorer is already active', () => {
    const onDismiss = vi.fn()
    render(<AppNavigationContext.Provider value={{ activeView: 'explorer', navigate: vi.fn() }}><LibraryStatusOverlay successDismissed={false} onDismissSuccess={onDismiss} /></AppNavigationContext.Provider>)
    expect(screen.queryByText('Library ready')).not.toBeInTheDocument()
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
