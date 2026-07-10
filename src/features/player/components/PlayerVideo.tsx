import { forwardRef } from 'react'

type PlayerVideoProps = {
  src: string | null
  title: string
}

export const PlayerVideo = forwardRef<HTMLVideoElement, PlayerVideoProps>(
  function PlayerVideo({ src, title }, ref) {
    if (!src) {
      return (
        <div className="flex h-full w-full items-center justify-center text-on-secondary">
          Preparing video…
        </div>
      )
    }

    return (
      <video
        key={src}
        ref={ref}
        src={src}
        controls
        autoPlay
        playsInline
        aria-label={title}
        className="h-full w-full bg-black object-contain"
      />
    )
  },
)
