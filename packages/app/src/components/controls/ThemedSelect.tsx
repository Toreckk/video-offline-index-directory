import type { ReactNode, RefObject } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { PopoverPortal } from './PopoverPortal'
import { useDismissiblePopover } from './useDismissiblePopover'

export type SelectOption<T extends string> = {
  value: T
  label: string
  detail?: string
}

type ThemedSelectProps<T extends string> = {
  ariaLabel: string
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
  icon?: ReactNode
  className?: string
  placeholder?: string
}

export function ThemedSelect<T extends string>({ ariaLabel, value, options, onChange, icon, className = '', placeholder }: ThemedSelectProps<T>) {
  const { isOpen, triggerRef, panelRef, toggle, close } = useDismissiblePopover()
  const selected = options.find((option) => option.value === value)

  return (
    <div className={className}>
      <button ref={triggerRef as RefObject<HTMLButtonElement>} data-void-popover-trigger type="button" onClick={toggle} className="flex h-full w-full items-center gap-2 border border-white/8 bg-surface-container px-3 py-2 text-left text-xs font-bold text-white transition hover:border-white/20" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={isOpen}>
        {icon}<span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span><ChevronDown size={14} className={`shrink-0 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <PopoverPortal anchorRef={triggerRef} panelRef={panelRef} width={240} className="border border-white/10 bg-surface-container-high py-1">
        <div role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const active = option.value === value
            return <button key={option.value} type="button" role="option" aria-selected={active} onClick={() => { onChange(option.value); close() }} className={`flex w-full items-center gap-3 whitespace-nowrap px-3 py-2.5 text-left text-xs transition ${active ? 'bg-primary/20 text-white' : 'text-on-secondary hover:bg-white/6 hover:text-white'}`}>
              <span className="flex h-4 w-4 items-center justify-center">{active && <Check size={13} className="text-primary-fixed-dim" />}</span><span className="min-w-0 flex-1">{option.label}</span>{option.detail && <span className="tabular-nums text-on-secondary">{option.detail}</span>}
            </button>
          })}
        </div></PopoverPortal>
      )}
    </div>
  )
}
