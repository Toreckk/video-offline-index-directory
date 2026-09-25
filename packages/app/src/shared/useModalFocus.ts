import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

const dialogs: Array<{ element: HTMLElement; priority: number }> = []
const selector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), video[controls], [tabindex]:not([tabindex="-1"])'
const topDialog = () => dialogs.reduce<(typeof dialogs)[number] | null>((top, entry) => !top || entry.priority >= top.priority ? entry : top, null)?.element ?? null

export function useModalFocus(ref: RefObject<HTMLElement | null>, enabled: boolean, onEscape: () => void, priority = 0) {
  const escape = useRef(onEscape)
  useEffect(() => { escape.current = onEscape }, [onEscape])
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!enabled || !dialog) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const siblings = new Map<HTMLElement, boolean>()
    const higher = dialogs.filter((entry) => entry.priority > priority).at(-1)?.element
    let branch: HTMLElement = dialog
    while (branch.parentElement && branch !== document.body) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement && !sibling.contains(higher ?? null)) {
          siblings.set(sibling, sibling.hasAttribute('inert'))
          sibling.setAttribute('inert', '')
        }
      }
      branch = branch.parentElement
    }
    dialogs.push({ element: dialog, priority })
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>(selector)].filter((element) => !element.closest('[hidden], [inert]') && getComputedStyle(element).visibility !== 'hidden' && getComputedStyle(element).display !== 'none')
    const focusFirst = () => (focusable()[0] ?? dialog).focus()
    const isTop = () => topDialog() === dialog
    if (isTop()) focusFirst()
    const handleKey = (event: KeyboardEvent) => {
      if (!isTop()) return
      if (event.key === 'Escape') {
        // The owned popup handles Escape first, then restores its trigger.
        if (dialog.querySelector('[data-void-popover-panel]')) return
        event.preventDefault()
        event.stopImmediatePropagation()
        escape.current()
      } else if (event.key === 'Tab') {
        const elements = focusable()
        const index = elements.indexOf(document.activeElement as HTMLElement)
        if (!elements.length || (event.shiftKey ? index <= 0 : index < 0 || index === elements.length - 1)) {
          event.preventDefault()
          ;(event.shiftKey ? elements.at(-1) ?? dialog : elements[0] ?? dialog).focus()
        }
      }
    }
    const keepFocus = (event: FocusEvent) => {
      if (isTop() && event.target instanceof Node && !dialog.contains(event.target)) focusFirst()
    }
    document.addEventListener('keydown', handleKey, true)
    document.addEventListener('focusin', keepFocus)
    return () => {
      const index = dialogs.findIndex((entry) => entry.element === dialog)
      if (index >= 0) dialogs.splice(index, 1)
      document.removeEventListener('keydown', handleKey, true)
      document.removeEventListener('focusin', keepFocus)
      for (const [sibling, inert] of siblings) sibling.toggleAttribute('inert', inert)
      const top = topDialog()
      if (previous?.isConnected && !previous.closest('[inert]') && (!top || top.contains(previous))) previous.focus()
      else if (top) (top.querySelector<HTMLElement>(selector) ?? top).focus()
    }
  }, [enabled, priority, ref])
}
