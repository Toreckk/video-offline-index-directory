import { ChevronLeft, ChevronRight } from 'lucide-react'

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
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onPrevious()
        }}
        className="absolute bottom-20 left-0 top-20 z-10 flex w-20 items-center justify-center bg-linear-to-r from-black/45 to-transparent opacity-0 transition hover:opacity-100 focus-visible:opacity-100"
        aria-label="Previous video"
      >
        <ChevronLeft size={38} />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onNext()
        }}
        className="absolute bottom-20 right-0 top-20 z-10 flex w-20 items-center justify-center bg-linear-to-l from-black/45 to-transparent opacity-0 transition hover:opacity-100 focus-visible:opacity-100"
        aria-label="Next video"
      >
        <ChevronRight size={38} />
      </button>
    </>
  )
}
