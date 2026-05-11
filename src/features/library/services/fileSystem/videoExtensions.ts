export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm'] as const

export const FUTURE_VIDEO_EXTENSIONS = ['.mov', '.mkv', '.r3d'] as const

export type SupportedVideoExtension =
  (typeof SUPPORTED_VIDEO_EXTENSIONS)[number]

export type FutureVideoExtension = (typeof FUTURE_VIDEO_EXTENSIONS)[number]

export function getSupportedVideoExtension(
  fileName: string,
): SupportedVideoExtension | null {
  const normalizedName = fileName.toLowerCase()

  return (
    SUPPORTED_VIDEO_EXTENSIONS.find((extension) =>
      normalizedName.endsWith(extension),
    ) ?? null
  )
}

export function isSupportedVideoFile(fileName: string) {
  return getSupportedVideoExtension(fileName) !== null
}

export function isFutureVideoFile(fileName: string) {
  const normalizedName = fileName.toLowerCase()

  return FUTURE_VIDEO_EXTENSIONS.some((extension) =>
    normalizedName.endsWith(extension),
  )
}
