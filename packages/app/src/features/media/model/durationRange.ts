export type KnownDurationRange = {
  mode: 'known'
  minimumSeconds?: number
  maximumSeconds?: number
}

export type DurationRange = KnownDurationRange | { mode: 'unknown' }

export type DurationPresetKey = 'under-5' | '5-15' | '15-30' | '30-60' | '60-plus' | 'unknown'

export const DURATION_PRESETS: ReadonlyArray<{
  key: DurationPresetKey
  label: string
  range: DurationRange
}> = [
  { key: 'under-5', label: 'Under 5 minutes', range: { mode: 'known', maximumSeconds: 5 * 60 } },
  { key: '5-15', label: '5–15 minutes', range: { mode: 'known', minimumSeconds: 5 * 60, maximumSeconds: 15 * 60 } },
  { key: '15-30', label: '15–30 minutes', range: { mode: 'known', minimumSeconds: 15 * 60, maximumSeconds: 30 * 60 } },
  { key: '30-60', label: '30–59 minutes', range: { mode: 'known', minimumSeconds: 30 * 60, maximumSeconds: 60 * 60 } },
  { key: '60-plus', label: '1 hour or longer', range: { mode: 'known', minimumSeconds: 60 * 60 } },
  { key: 'unknown', label: 'Unknown duration', range: { mode: 'unknown' } },
]

export function matchesDurationRange(durationSeconds: number | undefined, range: DurationRange) {
  const hasKnownDuration = isKnownDuration(durationSeconds)
  if (range.mode === 'unknown') return !hasKnownDuration
  if (!hasKnownDuration) return false
  if (range.minimumSeconds !== undefined && durationSeconds < range.minimumSeconds) return false
  // Upper bounds are exclusive, keeping adjacent presets from overlapping.
  if (range.maximumSeconds !== undefined && durationSeconds >= range.maximumSeconds) return false
  return true
}

export function isKnownDuration(durationSeconds: number | undefined): durationSeconds is number {
  return typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0
}

export function durationPresetKey(range: DurationRange): DurationPresetKey | 'custom' {
  const preset = DURATION_PRESETS.find((candidate) => durationRangesEqual(candidate.range, range))
  return preset?.key ?? 'custom'
}

export function durationRangeForPreset(key: DurationPresetKey) {
  return structuredClone(DURATION_PRESETS.find((preset) => preset.key === key)!.range)
}

export function describeDurationRange(range: DurationRange) {
  const preset = DURATION_PRESETS.find((candidate) => durationRangesEqual(candidate.range, range))
  if (preset) return preset.label
  if (range.mode === 'unknown') return 'Unknown duration'
  const minimum = range.minimumSeconds === undefined ? undefined : formatMinutes(range.minimumSeconds)
  const maximum = range.maximumSeconds === undefined ? undefined : formatMinutes(range.maximumSeconds)
  if (minimum !== undefined && maximum !== undefined) return `${minimum}–${maximum} min`
  if (minimum !== undefined) return `${minimum}+ min`
  if (maximum !== undefined) return `Under ${maximum} min`
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

function durationRangesEqual(left: DurationRange, right: DurationRange) {
  if (left.mode !== right.mode) return false
  if (left.mode === 'unknown' || right.mode === 'unknown') return true
  return left.minimumSeconds === right.minimumSeconds && left.maximumSeconds === right.maximumSeconds
}

function normalizeBound(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

function formatMinutes(seconds: number) {
  return Number((seconds / 60).toFixed(2))
}
