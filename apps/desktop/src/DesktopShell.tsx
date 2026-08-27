import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createDesktopWindowController, type DesktopWindowController } from '@void/platform-desktop'
import { useSettingsStore } from '../../../packages/app/src/features/settings/store/settingsStore'
import { DesktopTitleBar } from './DesktopTitleBar'

type DesktopShellProps = {
  children: ReactNode
}

export function DesktopShell({ children }: DesktopShellProps) {
  const controller = useMemo(() => createDesktopWindowController(), [])
  const isHydrated = useSettingsStore((state) => state.isHydrated)
  const prefersThemedTitleBar = useSettingsStore((state) => state.themedDesktopTitleBar)
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
