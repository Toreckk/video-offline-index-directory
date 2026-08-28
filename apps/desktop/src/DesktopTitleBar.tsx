import { useCallback, useEffect, useState } from 'react'
import type { DesktopWindowController } from '@void/platform-desktop'

type DesktopTitleBarProps = {
  controller: DesktopWindowController
}

export function DesktopTitleBar({ controller }: DesktopTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  const refreshMaximized = useCallback(() => {
    void controller.isMaximized().then(setIsMaximized).catch(() => undefined)
  }, [controller])

  useEffect(() => {
    refreshMaximized()
    let isActive = true
    let dispose: (() => void) | undefined
    void controller.onResized(refreshMaximized).then((unlisten) => {
      if (isActive) dispose = unlisten
      else unlisten()
    })
    return () => {
      isActive = false
      dispose?.()
    }
  }, [controller, refreshMaximized])

  return (
    <header className="desktop-titlebar" data-tauri-drag-region>
      <div className="desktop-titlebar__identity" data-tauri-drag-region>
        <img className="desktop-titlebar__icon" src="/favicon.svg" alt="" />
        <span data-tauri-drag-region>VOID</span>
      </div>
      <div className="desktop-titlebar__controls">
        <button className="desktop-titlebar__button" type="button" aria-label="Minimize" title="Minimize" onClick={() => void controller.minimize().catch((error: unknown) => console.error('Unable to minimize the desktop window.', error))}>
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 8.5h8" /></svg>
        </button>
        <button className="desktop-titlebar__button" type="button" aria-label={isMaximized ? 'Restore' : 'Maximize'} title={isMaximized ? 'Restore' : 'Maximize'} onClick={() => void controller.toggleMaximize().then(refreshMaximized).catch((error: unknown) => console.error('Unable to resize the desktop window.', error))}>
          {isMaximized
            ? <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 3.5V2h6.5v6.5H8.5M2 3.5h6.5V10H2z" /></svg>
            : <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2h8v8H2z" /></svg>}
        </button>
        <button className="desktop-titlebar__button desktop-titlebar__button--close" type="button" aria-label="Close" title="Close" onClick={() => void controller.close().catch((error: unknown) => console.error('Unable to close the desktop window.', error))}>
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2.5 2.5 7 7m0-7-7 7" /></svg>
        </button>
      </div>
    </header>
  )
}
