export type GeneratedThumbnail = {
  blob: Blob
  duration: number
  width: number
  height: number
}

type ThumbnailOptions = {
  timeoutMs?: number
  signal?: AbortSignal
}

export async function generateVideoThumbnail(
  source: MediaFileSource,
  options: ThumbnailOptions = {},
): Promise<GeneratedThumbnail> {
  const file = await openMediaFile(source)
  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  const timeoutMs = options.timeoutMs ?? 2_000

  video.muted = true
  video.playsInline = true
  video.preload = 'metadata'
  video.src = objectUrl

  try {
    await waitForMediaEvent(video, 'loadedmetadata', timeoutMs, options.signal)
    throwIfAborted(options.signal)

    const duration = Number.isFinite(video.duration) ? video.duration : 0
    const seekTarget = Math.min(1, Math.max(0, duration * 0.1))
    if (duration > 0) {
      video.currentTime = seekTarget
      await waitForMediaEvent(video, 'seeked', timeoutMs, options.signal)
    }

    const width = Math.max(1, video.videoWidth)
    const height = Math.max(1, video.videoHeight)
    const targetWidth = Math.min(640, width)
    const targetHeight = Math.max(1, Math.round((targetWidth / width) * height))
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d')

    if (!context) throw new Error('Canvas rendering is unavailable.')
    context.drawImage(video, 0, 0, targetWidth, targetHeight)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error('Thumbnail encoding failed.')),
        'image/jpeg',
        0.76,
      )
    })

    return { blob, duration, width, height }
  } finally {
    video.pause()
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(objectUrl)
  }
}

function waitForMediaEvent(
  video: HTMLVideoElement,
  eventName: 'loadedmetadata' | 'seeked',
  timeoutMs: number,
  signal: AbortSignal | undefined,
) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeoutId)
      video.removeEventListener(eventName, handleEvent)
      video.removeEventListener('error', handleError)
      signal?.removeEventListener('abort', handleAbort)
    }
    const handleEvent = () => {
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error(`Video failed while waiting for ${eventName}.`))
    }
    const handleAbort = () => {
      cleanup()
      reject(new DOMException('Thumbnail generation aborted.', 'AbortError'))
    }
    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error(`Timed out waiting for ${eventName}.`))
    }, timeoutMs)

    video.addEventListener(eventName, handleEvent, { once: true })
    video.addEventListener('error', handleError, { once: true })
    signal?.addEventListener('abort', handleAbort, { once: true })
    if (signal?.aborted) handleAbort()
  })
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) {
    throw new DOMException('Thumbnail generation aborted.', 'AbortError')
  }
}
import {
  openMediaFile,
  type MediaFileSource,
} from '../../library/services/mediaFileSource'
