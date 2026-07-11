import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

type PopoverPortalProps = {
  anchorRef: RefObject<HTMLElement | null>
  panelRef: RefObject<HTMLDivElement | null>
  children: ReactNode
  width: number
  align?: 'left' | 'right'
  className?: string
}

export function PopoverPortal({ anchorRef, panelRef, children, width, align = 'left', className = '' }: PopoverPortalProps) {
  const [position, setPosition] = useState({ left: 12, top: 12, maxHeight: 480, ready: false })

  useLayoutEffect(() => {
    const update = () => {
      const anchor = anchorRef.current
      const panel = panelRef.current
      if (!anchor || !panel) return
      const rect = anchor.getBoundingClientRect()
      const margin = 12
      const gap = 8
      const desiredLeft = align === 'right' ? rect.right - width : rect.left
      const left = Math.min(Math.max(margin, desiredLeft), Math.max(margin, window.innerWidth - width - margin))
      const availableBelow = window.innerHeight - rect.bottom - margin - gap
      const availableAbove = rect.top - margin - gap
      const useAbove = availableBelow < 320 && availableAbove > availableBelow
      const maxHeight = Math.max(220, useAbove ? availableAbove : availableBelow)
      const panelHeight = Math.min(panel.scrollHeight, maxHeight)
      const top = useAbove ? Math.max(margin, rect.top - gap - panelHeight) : rect.bottom + gap
      setPosition({ left, top, maxHeight, ready: true })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [align, anchorRef, panelRef, width])

  return createPortal(
    <div ref={panelRef} className={`fixed z-[120] overflow-y-auto shadow-2xl ${className}`} style={{ left: position.left, top: position.top, width, maxHeight: position.maxHeight, visibility: position.ready ? 'visible' : 'hidden' }}>
      {children}
    </div>,
    document.body,
  )
}
