export type KnownDurationRange = {
  mode: 'known'
  minimumSeconds?: number
  maximumSeconds?: number
}

export type DurationRange = KnownDurationRange | { mode: 'unknown' }

export type DurationBounds = {
  minimumSeconds: number
  maximumSeconds: number
}

export function matchesDurationRange(durationSeconds: number | undefined, range: DurationRange) {
  const hasKnownDuration = isKnownDuration(durationSeconds)
  if (range.mode === 'unknown') return !hasKnownDuration
  if (!hasKnownDuration) return false
  if (range.minimumSeconds !== undefined && durationSeconds < range.minimumSeconds) return false
  if (range.maximumSeconds !== undefined && durationSeconds > range.maximumSeconds) return false
  return true
}

export function isKnownDuration(durationSeconds: number | undefined): durationSeconds is number {
  return typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0
}

export function getDurationBounds(durations: readonly (number | undefined)[]): DurationBounds | null {
  let minimumSeconds = Number.POSITIVE_INFINITY
  let maximumSeconds = Number.NEGATIVE_INFINITY
  for (const duration of durations) {
    if (!isKnownDuration(duration)) continue
    minimumSeconds = Math.min(minimumSeconds, duration)
    maximumSeconds = Math.max(maximumSeconds, duration)
  }
  if (!Number.isFinite(minimumSeconds) || !Number.isFinite(maximumSeconds)) return null
  const roundedMinimum = Math.floor(minimumSeconds)
  const roundedMaximum = Math.ceil(maximumSeconds)
  return {
    minimumSeconds: roundedMinimum,
    maximumSeconds: Math.max(roundedMinimum + 1, roundedMaximum),
  }
}

export function isFullDurationRange(range: DurationRange | null, bounds: DurationBounds | null) {
  return range?.mode === 'known' && bounds !== null && range.minimumSeconds === bounds.minimumSeconds && range.maximumSeconds === bounds.maximumSeconds
}

export function describeDurationRange(range: DurationRange) {
  if (range.mode === 'unknown') return 'Unknown duration'
  const minimum = range.minimumSeconds === undefined ? undefined : formatDuration(range.minimumSeconds)
  const maximum = range.maximumSeconds === undefined ? undefined : formatDuration(range.maximumSeconds)
  if (minimum !== undefined && maximum !== undefined) return `${minimum}–${maximum}`
  if (minimum !== undefined) return `${minimum}+`
  if (maximum !== undefined) return `Up to ${maximum}`
  return 'Known duration'
}

export function normalizeDurationRange(range: DurationRange): DurationRange {
  if (range.mode === 'unknown') return { mode: 'unknown' }
  const minimumSeconds = normalizeBound(range.minimumSeconds)
  const maximumSeconds = normalizeBound(range.maximumSeconds)
  return {
    mode: 'known',
    ...(minimumSeconds !== undefined ? { minimumSeconds } : {}),
    ...(maximumSeconds !== undefined ? { maximumSeconds } : {}),
  }
}

export function formatDuration(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds))
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const remainder = rounded % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

function normalizeBound(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}
