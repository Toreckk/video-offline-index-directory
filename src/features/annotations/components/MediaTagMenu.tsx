import { useEffect, type RefObject } from 'react'
import { Tags } from 'lucide-react'
import { useAnnotationStore } from '../store/annotationStore'
import { PopoverPortal } from '../../../components/controls/PopoverPortal'
import { useDismissiblePopover } from '../../../components/controls/useDismissiblePopover'
import { MediaTagEditor } from './MediaTagEditor'

type MediaTagMenuProps = {
  mediaId: string
  align?: 'left' | 'right'
  compact?: boolean
  hiddenTrigger?: boolean
  openRequest?: number
}

export function MediaTagMenu({ mediaId, align = 'right', compact = false, hiddenTrigger = false, openRequest = 0 }: MediaTagMenuProps) {
  const { isOpen, triggerRef, panelRef, toggle, open } = useDismissiblePopover()
  const annotation = useAnnotationStore((state) => state.annotationsByMediaId[mediaId])
  const assignedTagIds = annotation?.tagIds ?? []

  useEffect(() => {
    if (openRequest > 0) open()
  }, [open, openRequest])

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef as RefObject<HTMLButtonElement>}
        data-void-popover-trigger
        type="button"
        onClick={toggle}
        className={`group/tooltip relative flex items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur transition hover:bg-black/85 ${compact ? 'h-9 w-9' : 'h-10 w-10'} ${hiddenTrigger ? 'pointer-events-none opacity-0' : ''}`}
        tabIndex={hiddenTrigger ? -1 : undefined}
        aria-label="Manage video tags"
        title="Manage video tags"
        aria-expanded={isOpen}
      >
        <Tags size={compact ? 16 : 18} />
        {assignedTagIds.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black">
            {assignedTagIds.length}
          </span>
        )}
        {!hiddenTrigger && <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-[400] mt-2 w-max -translate-x-1/2 border border-white/10 bg-surface-container-high px-2.5 py-1.5 text-[11px] font-bold text-white opacity-0 shadow-xl transition group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100">Manage video tags</span>}
      </button>

      {isOpen && (
        <PopoverPortal anchorRef={triggerRef} panelRef={panelRef} width={320} align={align} className="border border-white/10 bg-surface-container-high p-4 text-left">
          <MediaTagEditor mediaId={mediaId} />
        </PopoverPortal>
      )}
    </div>
  )
}
