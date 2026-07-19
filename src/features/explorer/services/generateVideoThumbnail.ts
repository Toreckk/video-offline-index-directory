import {
  openMediaFile,
  type MediaFileSource,
} from '../../library/services/mediaFileSource'

export type GeneratedThumbnail = {
  blob: Blob
  duration: number
  width: number
  height: number
  isDark: boolean
}

export type VideoMetadata = Pick<GeneratedThumbnail, 'duration' | 'width' | 'height'>

type ThumbnailOptions = {
  timeoutMs?: number
  signal?: AbortSignal
}

export async function generateVideoThumbnail(
  source: MediaFileSource,
  options: ThumbnailOptions = {},
): Promise<GeneratedThumbnail> {
  return captureVideoThumbnail(
    source,
    (duration) => [getThumbnailSeekTargets(duration)[0] ?? 0],
    options,
  )
}

export async function generateRefinedVideoThumbnail(
  source: MediaFileSource,
  options: ThumbnailOptions = {},
): Promise<GeneratedThumbnail> {
  return captureVideoThumbnail(
    source,
    (duration) => {
      const targets = getThumbnailSeekTargets(duration)
      return targets.slice(1).length > 0 ? targets.slice(1) : targets
    },
    options,
  )
}

async function captureVideoThumbnail(
  source: MediaFileSource,
  getSeekTargets: (duration: number) => number[],
  options: ThumbnailOptions,
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
    const width = Math.max(1, video.videoWidth)
    const height = Math.max(1, video.videoHeight)
    const targetWidth = Math.min(640, width)
    const targetHeight = Math.max(1, Math.round((targetWidth / width) * height))
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d')
    const probeCanvas = document.createElement('canvas')
    probeCanvas.width = 32
    probeCanvas.height = 18
    const probeContext = probeCanvas.getContext('2d')

    if (!context || !probeContext) throw new Error('Canvas rendering is unavailable.')
    const seekTargets = getSeekTargets(duration)
    let isDark = true
    for (let index = 0; index < seekTargets.length; index += 1) {
      const seekTarget = seekTargets[index] ?? 0
      if (duration > 0 && Math.abs(video.currentTime - seekTarget) > 0.01) {
        video.currentTime = seekTarget
        await waitForMediaEvent(video, 'seeked', timeoutMs, options.signal)
      }
      throwIfAborted(options.signal)
      isDark = isNearlyBlackFrame(probeContext, video)
      const isFinalCandidate = index === seekTargets.length - 1
      if (isFinalCandidate || !isDark) {
        context.drawImage(video, 0, 0, targetWidth, targetHeight)
        break
      }
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error('Thumbnail encoding failed.')),
        'image/jpeg',
        0.76,
      )
    })

    return { blob, duration, width, height, isDark }
  } finally {
    video.pause()
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(objectUrl)
  }
}

export function getThumbnailSeekTargets(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return [0]
  const safeEnd = Math.max(0, duration - 0.1)
  return [...new Set([
    Math.min(safeEnd, Math.min(1, duration * 0.1)),
    Math.min(safeEnd, duration * 0.35),
    Math.min(safeEnd, duration * 0.65),
  ].map((value) => Math.max(0, Number(value.toFixed(3)))))]
}

function isNearlyBlackFrame(context: CanvasRenderingContext2D, video: HTMLVideoElement) {
  context.drawImage(video, 0, 0, 32, 18)
  const pixels = context.getImageData(0, 0, 32, 18).data
  let luminanceTotal = 0
  let brightSamples = 0
  let samples = 0
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const luminance = (pixels[offset] ?? 0) * 0.2126 + (pixels[offset + 1] ?? 0) * 0.7152 + (pixels[offset + 2] ?? 0) * 0.0722
    luminanceTotal += luminance
    if (luminance >= 24) brightSamples += 1
    samples += 1
  }
  return samples === 0 || luminanceTotal / samples < 12 || brightSamples / samples < 0.025
}

export async function readVideoMetadata(
  source: MediaFileSource,
  options: ThumbnailOptions = {},
): Promise<VideoMetadata> {
  const file = await openMediaFile(source)
  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.src = objectUrl
  try {
    await waitForMediaEvent(video, 'loadedmetadata', options.timeoutMs ?? 5_000, options.signal)
    throwIfAborted(options.signal)
    return {
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      width: Math.max(1, video.videoWidth),
      height: Math.max(1, video.videoHeight),
    }
  } finally {
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
