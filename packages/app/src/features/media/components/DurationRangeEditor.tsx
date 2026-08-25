import { useState } from 'react'
import { ThemedSelect } from '../../../components/controls/ThemedSelect'
import {
  DURATION_PRESETS,
  durationPresetKey,
  durationRangeForPreset,
  type DurationPresetKey,
  type DurationRange,
} from '../model/durationRange'

export function DurationRangeEditor({ value, onChange, allowAny = false, idPrefix = 'duration', unknownCount }: {
  value: DurationRange | null
  onChange: (range: DurationRange | null) => void
  allowAny?: boolean
  idPrefix?: string
  unknownCount?: number
}) {
  const [editingCustom, setEditingCustom] = useState(() => value ? durationPresetKey(value) === 'custom' : false)
  const selectedKey = editingCustom ? 'custom' : value ? durationPresetKey(value) : 'any'
  const knownValue = value?.mode === 'known' ? value : undefined
  const [minimumMinutes, setMinimumMinutes] = useState(toMinutes(knownValue?.minimumSeconds))
  const [maximumMinutes, setMaximumMinutes] = useState(toMinutes(knownValue?.maximumSeconds))
  const parsedMinimumSeconds = parseMinutes(minimumMinutes)
  const parsedMaximumSeconds = parseMinutes(maximumMinutes)
  const hasInvalidCustomRange =
    (minimumMinutes.trim() !== '' && parsedMinimumSeconds === undefined) ||
    (maximumMinutes.trim() !== '' && parsedMaximumSeconds === undefined) ||
    (parsedMinimumSeconds !== undefined && parsedMaximumSeconds !== undefined && parsedMaximumSeconds <= parsedMinimumSeconds)

  const applyCustom = () => {
    if (hasInvalidCustomRange || (parsedMinimumSeconds === undefined && parsedMaximumSeconds === undefined)) return
    onChange({
      mode: 'known',
      ...(parsedMinimumSeconds !== undefined ? { minimumSeconds: parsedMinimumSeconds } : {}),
      ...(parsedMaximumSeconds !== undefined ? { maximumSeconds: parsedMaximumSeconds } : {}),
    })
  }

  return (
    <div className="min-w-60 flex-1">
      <ThemedSelect
        ariaLabel="Duration range"
        value={selectedKey}
        onChange={(key) => {
          if (key === 'any') {
            setEditingCustom(false)
            return onChange(null)
          }
          if (key === 'custom') {
            const custom = knownValue ?? { mode: 'known' as const }
            setEditingCustom(true)
            setMinimumMinutes(toMinutes(custom.minimumSeconds))
            setMaximumMinutes(toMinutes(custom.maximumSeconds))
            return onChange(custom)
          }
          setEditingCustom(false)
          onChange(durationRangeForPreset(key as DurationPresetKey))
        }}
        className="h-11 w-full"
        options={[
          ...(allowAny ? [{ value: 'any', label: 'Any duration' }] : []),
          ...DURATION_PRESETS.map((preset) => ({ value: preset.key, label: preset.label, ...(preset.key === 'unknown' && unknownCount !== undefined ? { detail: String(unknownCount) } : {}) })),
          { value: 'custom', label: 'Custom range' },
        ]}
      />
      {selectedKey === 'custom' && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="min-w-28 flex-1 text-[10px] font-black uppercase tracking-wider text-on-secondary">
            Minimum minutes
            <input id={`${idPrefix}-minimum`} type="number" min="0" step="0.1" value={minimumMinutes} onChange={(event) => setMinimumMinutes(event.target.value)} className="mt-1 h-10 w-full border border-white/10 bg-surface-dim px-3 text-sm text-white outline-none focus:border-primary/60" />
          </label>
          <label className="min-w-28 flex-1 text-[10px] font-black uppercase tracking-wider text-on-secondary">
            Maximum minutes
            <input id={`${idPrefix}-maximum`} type="number" min="0" step="0.1" value={maximumMinutes} onChange={(event) => setMaximumMinutes(event.target.value)} className="mt-1 h-10 w-full border border-white/10 bg-surface-dim px-3 text-sm text-white outline-none focus:border-primary/60" />
          </label>
          <button type="button" onClick={applyCustom} disabled={hasInvalidCustomRange || (minimumMinutes === '' && maximumMinutes === '')} className="h-10 bg-primary px-3 text-xs font-black disabled:opacity-40">Apply</button>
          <p className={`w-full text-[10px] ${hasInvalidCustomRange ? 'text-rose-200' : 'text-on-secondary'}`}>{hasInvalidCustomRange ? 'Maximum must be greater than minimum; both values must be zero or higher.' : 'Minimum is inclusive; maximum is exclusive.'}</p>
        </div>
      )}
    </div>
  )
}

function toMinutes(seconds: number | undefined) {
  return seconds === undefined ? '' : String(Number((seconds / 60).toFixed(2)))
}

function parseMinutes(value: string) {
  const parsed = Number(value)
  return value.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 ? parsed * 60 : undefined
}
