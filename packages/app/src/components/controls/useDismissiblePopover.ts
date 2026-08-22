import { useCallback, useEffect, useId, useRef, useState } from 'react'

const OPEN_POPOVER_EVENT = 'void:open-popover'

export function useDismissiblePopover() {
  const id = useId()
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const suppressNextClickRef = useRef(false)

  const close = useCallback(() => setIsOpen(false), [])
  const open = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_POPOVER_EVENT, { detail: id }))
    setIsOpen(true)
  }, [id])
  const toggle = useCallback(() => {
    if (!isOpen) window.dispatchEvent(new CustomEvent(OPEN_POPOVER_EVENT, { detail: id }))
    setIsOpen(!isOpen)
  }, [id, isOpen])

  useEffect(() => {
    const handleAnotherPopover = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) close()
    }
    window.addEventListener(OPEN_POPOVER_EVENT, handleAnotherPopover)
    return () => window.removeEventListener(OPEN_POPOVER_EVENT, handleAnotherPopover)
  }, [close, id])

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        const anotherTrigger = target instanceof Element && target.closest('[data-void-popover-trigger]')
        if (!anotherTrigger) {
          suppressNextClickRef.current = true
          event.stopPropagation()
        }
        close()
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [close, isOpen])

  useEffect(() => {
    const suppressOutsideClick = (event: MouseEvent) => {
      if (!suppressNextClickRef.current) return
      suppressNextClickRef.current = false
      event.preventDefault()
      event.stopPropagation()
    }
    document.addEventListener('click', suppressOutsideClick, true)
    return () => document.removeEventListener('click', suppressOutsideClick, true)
  }, [])

  return { isOpen, triggerRef, panelRef, toggle, open, close }
}
