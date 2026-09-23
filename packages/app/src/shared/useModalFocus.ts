import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

const dialogs: HTMLElement[] = []
const selector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), video[controls], [tabindex]:not([tabindex="-1"])'

export function useModalFocus(ref: RefObject<HTMLElement | null>, enabled: boolean, onEscape: () => void) {
  const escape = useRef(onEscape)
  useEffect(() => { escape.current = onEscape }, [onEscape])
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!enabled || !dialog) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const siblings = new Map<HTMLElement, boolean>()
    let branch: HTMLElement = dialog
    while (branch.parentElement && branch !== document.body) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          siblings.set(sibling, sibling.hasAttribute('inert'))
          sibling.setAttribute('inert', '')
        }
      }
      branch = branch.parentElement
    }
    dialogs.push(dialog)
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>(selector)].filter((element) => !element.closest('[hidden], [inert]') && getComputedStyle(element).visibility !== 'hidden' && getComputedStyle(element).display !== 'none')
    const focusFirst = () => (focusable()[0] ?? dialog).focus()
    focusFirst()
    const isTop = () => dialogs.at(-1) === dialog
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
      dialogs.splice(dialogs.indexOf(dialog), 1)
      document.removeEventListener('keydown', handleKey, true)
      document.removeEventListener('focusin', keepFocus)
      for (const [sibling, inert] of siblings) sibling.toggleAttribute('inert', inert)
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus()
    }
  }, [enabled, ref])
}
