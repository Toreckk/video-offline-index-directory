import type { ButtonHTMLAttributes, ReactNode } from 'react'

type TooltipIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string
  children: ReactNode
  tooltipSide?: 'below' | 'above' | 'left' | 'right'
}

const TOOLTIP_POSITION = {
  below: 'left-1/2 top-full mt-2 -translate-x-1/2',
  above: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
}

export function TooltipIconButton({ label, children, tooltipSide = 'below', className = '', ...buttonProps }: TooltipIconButtonProps) {
  return (
    <button {...buttonProps} type="button" aria-label={label} className={`group/tooltip relative ${className}`}>
      {children}
      <span role="tooltip" className={`pointer-events-none absolute z-[400] w-max max-w-52 border border-white/10 bg-surface-container-high px-2.5 py-1.5 text-[11px] font-bold text-white opacity-0 shadow-xl transition group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100 ${TOOLTIP_POSITION[tooltipSide]}`}>
        {label}
      </span>
    </button>
  )
}
