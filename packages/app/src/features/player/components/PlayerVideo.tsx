import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

type PlayerVideoProps = {
  src: string | null
  title: string
  resumeAt: number
  defaultVolume: number
  defaultPlaybackRate: number
  preparationError?: string | null
  onProgress: (positionSeconds: number, durationSeconds: number) => void
  onComplete: (durationSeconds: number) => void
}

export const PlayerVideo = forwardRef<HTMLVideoElement, PlayerVideoProps>(
  function PlayerVideo(props, ref) {
    if (!props.src) return <div role="status" className="p-6 text-on-secondary">{props.preparationError ?? 'Preparing video…'}</div>
    return <VideoSession key={props.src} {...props} src={props.src} ref={ref} />
  },
)

const VideoSession = forwardRef<HTMLVideoElement, PlayerVideoProps & { src: string }>(
  function VideoSession(props, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const initial = useRef(props)
    const callbacks = useRef(props)
    const [status, setStatus] = useState<string | null>('Loading video…')
    const [failed, setFailed] = useState(false)
    useImperativeHandle(ref, () => videoRef.current!, [])
    useEffect(() => { callbacks.current = props }, [props])

    useEffect(() => {
      const video = videoRef.current!
      const settings = initial.current
      let active = true
      let restored = false
      let lastSavedAt = 0
      const save = () => {
        if (active && Number.isFinite(video.duration) && video.duration > 0) {
          callbacks.current.onProgress(video.currentTime, video.duration)
        }
      }
      const fail = (message: string) => { if (active) { setFailed(true); setStatus(message) } }
      const play = () => {
        void video.play().catch(() => fail('Playback could not start. Use the video controls to retry.'))
      }
      const metadata = () => {
        if (!active || restored) return
        restored = true
        video.volume = Math.max(0, Math.min(1, settings.defaultVolume))
        video.playbackRate = Math.max(0.25, Math.min(4, settings.defaultPlaybackRate))
        if (settings.resumeAt > 0 && Number.isFinite(video.duration)) video.currentTime = Math.min(settings.resumeAt, Math.max(0, video.duration - 1))
        play()
      }
      const progress = () => {
        if (Date.now() - lastSavedAt < 2000) return
        lastSavedAt = Date.now()
        save()
      }
      const ended = () => { if (active) callbacks.current.onComplete(video.duration) }
      const playing = () => { if (active) { setFailed(false); setStatus(null) } }
      const waiting = () => { if (active) setStatus('Buffering…') }
      const error = () => fail(video.error?.code === 4
        ? 'This video format or codec is not supported by this player.'
        : video.error?.code === 2 ? 'The video could not be read. Check that its folder or drive is connected.'
          : 'The video could not be decoded. It may be damaged or use an unsupported codec.')
      video.addEventListener('loadedmetadata', metadata)
      video.addEventListener('timeupdate', progress)
      video.addEventListener('pause', save)
      video.addEventListener('void:flush-progress', save)
      video.addEventListener('ended', ended)
      video.addEventListener('playing', playing)
      video.addEventListener('waiting', waiting)
      video.addEventListener('error', error)
      // Also reattach after StrictMode's setup/cleanup rehearsal.
      video.src = settings.src
      video.load()
      return () => {
        save()
        active = false
        video.removeEventListener('loadedmetadata', metadata)
        video.removeEventListener('timeupdate', progress)
        video.removeEventListener('pause', save)
        video.removeEventListener('void:flush-progress', save)
        video.removeEventListener('ended', ended)
        video.removeEventListener('playing', playing)
        video.removeEventListener('waiting', waiting)
        video.removeEventListener('error', error)
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
    }, [])

    return <>
      <video ref={videoRef} controls playsInline aria-label={props.title} className="h-full w-full bg-black object-contain" />
      {status && <div role={failed ? 'alert' : 'status'} className="pointer-events-none absolute left-4 top-4 max-w-[70%] rounded bg-black/80 p-3 text-sm text-white">{status}</div>}
    </>
  },
)
