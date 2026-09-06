import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createDesktopWindowController, type DesktopWindowController } from '@void/platform-desktop'
import { useSettingsStore } from '../../../packages/app/src/features/settings/store/settingsStore'
import { DesktopTitleBar } from './DesktopTitleBar'
import { flushUserData, getPersistenceStatus, reportPersistenceFailure } from '../../../packages/app/src/shared/persistence/userDataCoordinator'

type DesktopShellProps = {
  children: ReactNode
}

export function DesktopShell({ children }: DesktopShellProps) {
  const controller = useMemo(() => createDesktopWindowController(), [])
  const isHydrated = useSettingsStore((state) => state.isHydrated)
  const prefersThemedTitleBar = useSettingsStore((state) => state.themedDesktopTitleBar)
  useEffect(() => {
    let disposed = false
    let closing = false
    let approved = false
    let unlisten: (() => void) | undefined
    void controller.onCloseRequested?.((event) => {
      if (approved || ['idle', 'migration'].includes(getPersistenceStatus().phase)) return
      event.preventDefault()
      if (closing) return
      closing = true
      // pause queues a browser event; explicitly capture progress before awaiting storage.
      document.querySelectorAll('video').forEach((video) => { video.pause(); video.dispatchEvent(new Event('void:flush-progress')) })
      void flushUserData().then(async () => { approved = true; await controller.close() })
        .catch(reportPersistenceFailure).finally(() => { closing = false })
    }).then((stop) => { if (disposed) stop(); else unlisten = stop }).catch(reportPersistenceFailure)
    return () => { disposed = true; unlisten?.() }
  }, [controller])
  return (
    <DesktopShellFrame
      controller={controller}
      isHydrated={isHydrated}
      prefersThemedTitleBar={prefersThemedTitleBar}
    >
      {children}
    </DesktopShellFrame>
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
