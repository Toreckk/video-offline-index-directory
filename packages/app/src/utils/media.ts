import type { SupportedVideoExtension } from '../features/library/services/fileSystem'

export function createMediaId(
  libraryId: string,
  pathParts: readonly string[],
  fileName: string,
) {
  return [libraryId, ...pathParts, fileName]
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

export function formatDuration(durationSeconds: number | undefined) {
  if (durationSeconds === undefined || !Number.isFinite(durationSeconds)) {
    return '--:--'
  }

  const totalSeconds = Math.max(0, Math.floor(durationSeconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function getDisplayPath(pathParts: readonly string[], name: string) {
  return [...pathParts, name].join(' / ')
}

export function isSupportedVideoExtension(
  extension: string,
): extension is SupportedVideoExtension {
  return extension === '.mp4' || extension === '.webm'
}
