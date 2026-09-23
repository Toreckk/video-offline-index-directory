import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createDesktopWindowController, type DesktopWindowController } from '@void/platform-desktop'
import { useSettingsStore } from '../../../packages/app/src/features/settings/store/settingsStore'
import { DesktopTitleBar } from './DesktopTitleBar'
import { exportRecovery, flushUserData, getPersistenceStatus, hasUnsavedUserData, retryUserData } from '../../../packages/app/src/shared/persistence/userDataCoordinator'
import { useModalFocus } from '../../../packages/app/src/shared/useModalFocus'

type DesktopShellProps = {
  children: ReactNode
}

export function DesktopShell({ children }: DesktopShellProps) {
  const controller = useMemo(() => createDesktopWindowController(), [])
  const isHydrated = useSettingsStore((state) => state.isHydrated)
  const prefersThemedTitleBar = useSettingsStore((state) => state.themedDesktopTitleBar)
  const [exit, setExit] = useState<{ phase: 'saving' | 'slow' | 'error'; message?: string } | null>(null)
  const exitRef = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const approved = useRef(false)
  const attempt = useRef(0)
  const timer = useRef<number | null>(null)
  const clearTimer = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }, [])
  const cancelExit = useCallback(() => {
    attempt.current += 1
    busy.current = false
    clearTimer()
    setExit(null)
  }, [clearTimer])
  useModalFocus(exitRef, exit !== null, cancelExit)
  const closeNow = useCallback(() => {
    approved.current = true
    // The requested close was already intercepted. Destroy after the save to
    // avoid another close-request round trip through the same listener.
    void controller.destroy().catch((error: unknown) => {
      approved.current = false
      busy.current = false
      setExit({ phase: 'error', message: `The window could not close: ${String(error)}` })
    })
  }, [controller])
  const saveAndClose = useCallback(() => {
    if (busy.current || approved.current) return
    busy.current = true
    const current = ++attempt.current
    setExit({ phase: 'saving' })
    clearTimer()
    timer.current = window.setTimeout(() => {
      if (attempt.current === current) setExit({ phase: 'slow' })
    }, 2500)
    void flushUserData().then(() => {
      if (attempt.current !== current) return
      clearTimer()
      closeNow()
    }).catch((error: unknown) => {
      if (attempt.current !== current) return
      clearTimer()
      busy.current = false
      setExit({ phase: 'error', message: String(error) })
    })
  }, [clearTimer, closeNow])
  useEffect(() => {
    let disposed = false
    let unlisten: (() => void) | undefined
    void controller.onCloseRequested?.((event) => {
      if (approved.current) return
      // Pause and capture the last frame before deciding whether a save is needed.
      document.querySelectorAll('video').forEach((video) => { video.pause(); video.dispatchEvent(new Event('void:flush-progress')) })
      if (!hasUnsavedUserData()) return
      event.preventDefault()
      saveAndClose()
    }).then((stop) => { if (disposed) stop(); else unlisten = stop }).catch((error: unknown) => {
      setExit({ phase: 'error', message: `Unable to monitor the window close request: ${String(error)}` })
    })
    return () => { disposed = true; unlisten?.(); attempt.current += 1; clearTimer() }
  }, [clearTimer, controller, saveAndClose])
  return (
    <>
      <DesktopShellFrame controller={controller} isHydrated={isHydrated} prefersThemedTitleBar={prefersThemedTitleBar}>
        {children}
      </DesktopShellFrame>
      {exit && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-6">
        <div ref={exitRef} role="alertdialog" aria-modal="true" aria-labelledby="void-close-title" tabIndex={-1} className="w-full max-w-md space-y-4 border border-white/20 bg-surface-container p-6 text-on-surface">
          <h2 id="void-close-title" className="text-lg font-bold">{exit.phase === 'error' ? 'Could not save before closing' : 'Saving before closing…'}</h2>
          <p className="text-sm">{exit.phase === 'error' ? exit.message : exit.phase === 'slow' ? 'Saving is taking longer than expected. You can wait, export recovery data, or close without waiting for the save.' : 'VOID is saving your latest playback position and organization.'}</p>
          <div className="flex flex-wrap gap-3">
            {exit.phase === 'error' && <button type="button" className="border px-4 py-2" onClick={() => void retryUserData().then(() => {
              if (getPersistenceStatus().phase === 'ready') saveAndClose()
              else setExit({ phase: 'error', message: getPersistenceStatus().message ?? 'Saving still failed.' })
            })}>Retry save</button>}
            <button type="button" className="border px-4 py-2" onClick={() => void exportRecovery().catch((error: unknown) => setExit({ phase: 'error', message: `Recovery export failed: ${String(error)}` }))}>Export recovery data</button>
            <button type="button" className="border px-4 py-2" onClick={cancelExit}>Keep app open</button>
            {exit.phase !== 'saving' && <button type="button" className="border border-red-400/60 px-4 py-2" onClick={() => { attempt.current += 1; clearTimer(); closeNow() }}>Close without saving</button>}
          </div>
        </div>
      </div>}
    </>
  )
}

type DesktopShellFrameProps = DesktopShellProps & {
  controller: DesktopWindowController
  isHydrated: boolean
  prefersThemedTitleBar: boolean
}

export function DesktopShellFrame({
  children,
  controller,
  isHydrated,
  prefersThemedTitleBar,
}: DesktopShellFrameProps) {
  const [hasThemedTitleBar, setHasThemedTitleBar] = useState(false)
  const hasThemedTitleBarRef = useRef(false)
  const isMountedRef = useRef(true)
  const decorationQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    const decorationUpdate = decorationQueue.current
      .catch(() => undefined)
      .then(async () => {
        const previousThemedTitleBar = hasThemedTitleBarRef.current
        if (!prefersThemedTitleBar) updateThemedTitleBar(false)
        try {
          await controller.setDecorations(!prefersThemedTitleBar)
        } catch (error) {
          updateThemedTitleBar(previousThemedTitleBar)
          throw error
        }
        if (prefersThemedTitleBar) updateThemedTitleBar(true)
      })
    decorationQueue.current = decorationUpdate
    void decorationUpdate.catch((error: unknown) => {
      console.error('Unable to change desktop title bar decorations.', error)
    })

    function updateThemedTitleBar(value: boolean) {
      hasThemedTitleBarRef.current = value
      if (isMountedRef.current) setHasThemedTitleBar(value)
    }
  }, [controller, isHydrated, prefersThemedTitleBar])

  return (
    <div className={`desktop-shell${hasThemedTitleBar ? ' desktop-shell--themed' : ''}`}>
      {hasThemedTitleBar && <DesktopTitleBar controller={controller} />}
      <div className="desktop-shell__content">{children}</div>
    </div>
  )
}
