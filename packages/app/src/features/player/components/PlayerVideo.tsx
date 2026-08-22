import { forwardRef, useEffect, useRef } from 'react'

type PlayerVideoProps = {
  src: string | null
  title: string
  resumeAt: number
  defaultVolume: number
  defaultPlaybackRate: number
  onProgress: (positionSeconds: number, durationSeconds: number) => void
  onComplete: (durationSeconds: number) => void
}

export const PlayerVideo = forwardRef<HTMLVideoElement, PlayerVideoProps>(
  function PlayerVideo({ src, title, resumeAt, defaultVolume, defaultPlaybackRate, onProgress, onComplete }, ref) {
    const lastSavedAtRef = useRef(0)
    const hasRestoredRef = useRef(false)

    useEffect(() => {
      hasRestoredRef.current = false
      lastSavedAtRef.current = 0
    }, [src])
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
        onLoadedMetadata={(event) => {
          event.currentTarget.volume = Math.max(0, Math.min(1, defaultVolume))
          event.currentTarget.playbackRate = Math.max(0.25, Math.min(4, defaultPlaybackRate))
          if (hasRestoredRef.current || resumeAt <= 0) return
          event.currentTarget.currentTime = Math.min(resumeAt, Math.max(0, event.currentTarget.duration - 1))
          hasRestoredRef.current = true
        }}
        onTimeUpdate={(event) => {
          const now = Date.now()
          if (now - lastSavedAtRef.current < 2000) return
          lastSavedAtRef.current = now
          onProgress(event.currentTarget.currentTime, event.currentTarget.duration)
        }}
        onPause={(event) => onProgress(event.currentTarget.currentTime, event.currentTarget.duration)}
        onEnded={(event) => onComplete(event.currentTarget.duration)}
      />
    )
  },
)
