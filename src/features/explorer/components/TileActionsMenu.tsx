import { CheckCircle2, Clipboard, Info, MoreVertical, Play } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import { PopoverPortal } from '../../../components/controls/PopoverPortal'
import { useDismissiblePopover } from '../../../components/controls/useDismissiblePopover'
import { getLibraryRelativeMediaPath } from '../../library/services/mediaFileSource'
import { copyTextToClipboard } from '../../../utils/clipboard'

export function TileActionsMenu({ name, pathParts, isWatched, onOpen, onToggleWatched, onShowInfo }: {
  name: string
  pathParts: readonly string[]
  isWatched: boolean
  onOpen: () => void
  onToggleWatched: () => void
  onShowInfo: () => void
}) {
  const { isOpen, triggerRef, panelRef, toggle, close } = useDismissiblePopover()
  const act = (action: () => void) => { close(); action() }
  return <>
    <button ref={triggerRef as RefObject<HTMLButtonElement>} data-void-popover-trigger type="button" onClick={(event) => { event.stopPropagation(); toggle() }} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/65 text-white opacity-80 backdrop-blur transition hover:bg-black/90 hover:opacity-100 focus-visible:opacity-100" aria-label={`Actions for ${name}`} aria-expanded={isOpen}><MoreVertical size={18} /></button>
    {isOpen && <PopoverPortal anchorRef={triggerRef} panelRef={panelRef} width={230} align="right" className="border border-white/10 bg-surface-container-high py-1 text-left">
      <div role="menu" aria-label={`Actions for ${name}`}>
        <MenuAction icon={<Play size={15} />} label="Play video" onClick={() => act(onOpen)} />
        <MenuAction icon={<CheckCircle2 size={15} />} label={isWatched ? 'Mark as unwatched' : 'Mark as watched'} onClick={() => act(onToggleWatched)} active={isWatched} />
        <MenuAction icon={<Info size={15} />} label="Video info" onClick={() => act(onShowInfo)} />
        <div className="my-1 border-t border-white/8" />
        <MenuAction icon={<Clipboard size={15} />} label="Copy relative path" onClick={() => act(() => void copyTextToClipboard(getLibraryRelativeMediaPath(pathParts, name)).catch(() => undefined))} />
      </div>
    </PopoverPortal>}
  </>
}

function MenuAction({ icon, label, onClick, active = false }: { icon: ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return <button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); onClick() }} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-bold ${active ? 'text-primary-fixed-dim' : 'text-on-secondary hover:bg-white/6 hover:text-white'}`}>{icon}<span>{label}</span></button>
}
