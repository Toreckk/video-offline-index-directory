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
      <TooltipIconButton
        label="Previous video"
        tooltipSide="right"
        onClick={(event) => {
          event.stopPropagation()
          onPrevious()
        }}
        className="absolute left-3 top-1/2 z-30 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/75 text-white shadow-xl backdrop-blur transition hover:bg-primary/80 lg:-left-20"
      >
        <ChevronLeft size={38} />
      </TooltipIconButton>
      <TooltipIconButton
        label="Next video"
        tooltipSide="left"
        onClick={(event) => {
          event.stopPropagation()
          onNext()
        }}
        className="absolute right-3 top-1/2 z-30 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/75 text-white shadow-xl backdrop-blur transition hover:bg-primary/80 lg:-right-20"
      >
        <ChevronRight size={38} />
      </TooltipIconButton>
    </>
  )
}
