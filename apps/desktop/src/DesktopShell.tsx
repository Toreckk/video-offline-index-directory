import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createDesktopWindowController } from '@void/platform-desktop'
import { useSettingsStore } from '../../../packages/app/src/features/settings/store/settingsStore'
import { DesktopTitleBar } from './DesktopTitleBar'

type DesktopShellProps = {
  children: ReactNode
}

export function DesktopShell({ children }: DesktopShellProps) {
  const controller = useMemo(() => createDesktopWindowController(), [])
  const isHydrated = useSettingsStore((state) => state.isHydrated)
  const prefersThemedTitleBar = useSettingsStore((state) => state.themedDesktopTitleBar)
  const wantsThemedTitleBar = isHydrated && prefersThemedTitleBar
  const [hasThemedTitleBar, setHasThemedTitleBar] = useState(false)

  useEffect(() => {
    let isCurrent = true
    void controller.setDecorations(!wantsThemedTitleBar)
      .then(() => {
        if (isCurrent) setHasThemedTitleBar(wantsThemedTitleBar)
      })
      .catch((error: unknown) => {
        console.error('Unable to change desktop title bar decorations.', error)
        if (isCurrent) setHasThemedTitleBar(false)
      })
    return () => {
      isCurrent = false
    }
  }, [controller, wantsThemedTitleBar])

  return (
    <div className={`desktop-shell${hasThemedTitleBar ? ' desktop-shell--themed' : ''}`}>
      {hasThemedTitleBar && <DesktopTitleBar controller={controller} />}
      <div className="desktop-shell__content">{children}</div>
    </div>
  )
}
