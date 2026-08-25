import type { ReactNode } from 'react'
import {
  describeDurationRange,
  formatDuration,
  type DurationBounds,
  type DurationRange,
} from '../model/durationRange'

export function DurationRangeEditor({ value, bounds, onChange, allowAny = false, idPrefix = 'duration', unknownCount }: {
  value: DurationRange | null
  bounds: DurationBounds | null
  onChange: (range: DurationRange | null) => void
  allowAny?: boolean
  idPrefix?: string
  unknownCount?: number
}) {
  const isKnownRange = value?.mode === 'known'
  const selectedMinimum = bounds ? clamp(value?.mode === 'known' ? value.minimumSeconds ?? bounds.minimumSeconds : bounds.minimumSeconds, bounds) : 0
  const selectedMaximum = bounds ? clamp(value?.mode === 'known' ? value.maximumSeconds ?? bounds.maximumSeconds : bounds.maximumSeconds, bounds) : 0
  const span = bounds ? Math.max(1, bounds.maximumSeconds - bounds.minimumSeconds) : 1
  const startPercent = bounds ? (selectedMinimum - bounds.minimumSeconds) / span * 100 : 0
  const endPercent = bounds ? (selectedMaximum - bounds.minimumSeconds) / span * 100 : 100

  const setKnownRange = (minimumSeconds: number, maximumSeconds: number) => {
    if (!bounds) return
    const nextMinimum = clamp(minimumSeconds, bounds)
    const nextMaximum = clamp(maximumSeconds, bounds)
    onChange({
      mode: 'known',
      minimumSeconds: Math.min(nextMinimum, nextMaximum),
      maximumSeconds: Math.max(nextMinimum, nextMaximum),
    })
  }

  const activateRange = () => {
    if (!bounds) return
    onChange({ mode: 'known', minimumSeconds: bounds.minimumSeconds, maximumSeconds: bounds.maximumSeconds })
  }

  return (
    <div className="min-w-64 flex-1">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Duration filter mode">
        {allowAny && <ModeButton active={value === null} onClick={() => onChange(null)}>Any</ModeButton>}
        <ModeButton active={isKnownRange} disabled={!bounds} onClick={activateRange}>Range</ModeButton>
        <ModeButton active={value?.mode === 'unknown'} onClick={() => onChange({ mode: 'unknown' })}>Unknown{unknownCount !== undefined ? ` (${unknownCount})` : ''}</ModeButton>
      </div>

      {isKnownRange && bounds && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-xs font-black tabular-nums">
            <span className="text-primary-fixed-dim">{formatDuration(selectedMinimum)}</span>
            <span className="text-on-secondary">{describeDurationRange({ mode: 'known', minimumSeconds: selectedMinimum, maximumSeconds: selectedMaximum })}</span>
            <span className="text-primary-fixed-dim">{formatDuration(selectedMaximum)}</span>
          </div>
          <div className="relative mt-3 h-7" data-testid="duration-range-slider">
            <div className="absolute left-0 right-0 top-3 h-1 bg-white/10" />
            <div className="absolute top-3 h-1 bg-primary" style={{ left: `${startPercent}%`, width: `${Math.max(0, endPercent - startPercent)}%` }} />
            <input aria-label="Minimum duration" type="range" min={bounds.minimumSeconds} max={bounds.maximumSeconds} step="1" value={selectedMinimum} onChange={(event) => setKnownRange(Math.min(Number(event.target.value), selectedMaximum), selectedMaximum)} className="void-duration-range absolute inset-0 z-20 w-full" />
            <input aria-label="Maximum duration" type="range" min={bounds.minimumSeconds} max={bounds.maximumSeconds} step="1" value={selectedMaximum} onChange={(event) => setKnownRange(selectedMinimum, Math.max(Number(event.target.value), selectedMinimum))} className="void-duration-range absolute inset-0 z-30 w-full" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <DurationNumberField id={`${idPrefix}-minimum`} label="Minimum minutes" value={selectedMinimum} bounds={bounds} onChange={(seconds) => setKnownRange(Math.min(seconds, selectedMaximum), selectedMaximum)} />
            <DurationNumberField id={`${idPrefix}-maximum`} label="Maximum minutes" value={selectedMaximum} bounds={bounds} onChange={(seconds) => setKnownRange(selectedMinimum, Math.max(seconds, selectedMinimum))} />
          </div>
          <p className="mt-2 text-[10px] text-on-secondary">Library range: {formatDuration(bounds.minimumSeconds)} to {formatDuration(bounds.maximumSeconds)}. Both selected limits are included.</p>
        </div>
      )}

      {!bounds && value?.mode !== 'unknown' && <p className="mt-3 text-xs text-on-secondary">Duration metadata is not available for this library yet.</p>}
    </div>
  )
}

function ModeButton({ active, disabled = false, onClick, children }: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return <button type="button" disabled={disabled} onClick={onClick} aria-pressed={active} className={`border px-3 py-2 text-xs font-black ${active ? 'border-primary/60 bg-primary/20 text-white' : 'border-white/10 text-on-secondary hover:text-white'} disabled:cursor-not-allowed disabled:opacity-35`}>{children}</button>
}

function DurationNumberField({ id, label, value, bounds, onChange }: {
  id: string
  label: string
  value: number
  bounds: DurationBounds
  onChange: (seconds: number) => void
}) {
  return (
    <label htmlFor={id} className="text-[10px] font-black uppercase tracking-wider text-on-secondary">
      {label}
      <input id={id} type="number" min={toMinutes(bounds.minimumSeconds)} max={toMinutes(bounds.maximumSeconds)} step="0.1" value={toMinutes(value)} onChange={(event) => {
        const minutes = Number(event.target.value)
        if (Number.isFinite(minutes)) onChange(clamp(minutes * 60, bounds))
      }} className="mt-1 h-10 w-full border border-white/10 bg-surface-dim px-3 text-sm text-white outline-none focus:border-primary/60" />
    </label>
  )
}

function clamp(value: number, bounds: DurationBounds) {
  return Math.min(bounds.maximumSeconds, Math.max(bounds.minimumSeconds, value))
}

function toMinutes(seconds: number) {
  return Number((seconds / 60).toFixed(2))
}
