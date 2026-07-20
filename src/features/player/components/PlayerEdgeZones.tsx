import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TooltipIconButton } from '../../../components/controls/TooltipIconButton'

export function PlayerEdgeZones({
  canNavigate,
  onPrevious,
  onNext,
}: {
  canNavigate: boolean
  onPrevious: () => void
  onNext: () => void
}) {
  if (!canNavigate) return null

  return (
    <>
      <div className="pointer-events-auto absolute left-4 top-1/2 z-50 -translate-y-1/2">
        <TooltipIconButton
          label="Previous video"
          tooltipSide="right"
          onClick={(event) => {
            event.stopPropagation()
            onPrevious()
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-black/75 text-white shadow-[0_8px_30px_rgba(0,0,0,0.75)] backdrop-blur transition hover:border-primary/80 hover:bg-primary"
        >
          <ChevronLeft aria-hidden="true" size={32} strokeWidth={2.5} />
        </TooltipIconButton>
      </div>
      <div className="pointer-events-auto absolute right-4 top-1/2 z-50 -translate-y-1/2">
        <TooltipIconButton
          label="Next video"
          tooltipSide="left"
          onClick={(event) => {
            event.stopPropagation()
            onNext()
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-black/75 text-white shadow-[0_8px_30px_rgba(0,0,0,0.75)] backdrop-blur transition hover:border-primary/80 hover:bg-primary"
        >
          <ChevronRight aria-hidden="true" size={32} strokeWidth={2.5} />
        </TooltipIconButton>
      </div>
    </>
  )
}
