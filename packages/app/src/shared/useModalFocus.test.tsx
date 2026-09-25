/** @vitest-environment jsdom */
import { useRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useModalFocus } from './useModalFocus'

function Dialog({ close }: { close: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, true, close)
  return <div ref={ref} role="dialog" tabIndex={-1}><button>First</button><button>Last</button></div>
}
function LaterBackgroundDialog() {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, true, () => {})
  return <div ref={ref} role="dialog" tabIndex={-1}><button>Recovery action</button></div>
}
function PriorityDialog() {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, true, () => {}, 10)
  return <div ref={ref} role="alertdialog" tabIndex={-1}><button>Close choice</button></div>
}
it('contains keyboard focus, makes the background inert and returns focus when closed', () => {
  const trigger = document.createElement('button')
  document.body.append(trigger)
  trigger.focus()
  const close = vi.fn()
  const view = render(<Dialog close={close} />)
  expect(screen.getByText('First')).toHaveFocus()
  expect(trigger).toHaveAttribute('inert')
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
  expect(screen.getByText('Last')).toHaveFocus()
  fireEvent.keyDown(document, { key: 'Tab' })
  expect(screen.getByText('First')).toHaveFocus()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(close).toHaveBeenCalledOnce()
  view.unmount()
  expect(trigger).not.toHaveAttribute('inert')
  expect(trigger).toHaveFocus()
  trigger.remove()
})
it('keeps the higher-priority close dialog focused when a recovery dialog mounts later', () => {
  const view = render(<PriorityDialog />)
  expect(screen.getByText('Close choice')).toHaveFocus()
  view.rerender(<><PriorityDialog /><LaterBackgroundDialog /></>)
  expect(screen.getByText('Close choice')).toHaveFocus()
  screen.getByText('Recovery action').focus()
  expect(screen.getByText('Close choice')).toHaveFocus()
  view.unmount()
})
